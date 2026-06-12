import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authenticateToken, signToken } from '../middleware/auth.js';
import { sendMail } from '../services/email.js';
import { resetPasswordEmail, setupPasswordEmail } from '../services/emailTemplates.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RESET_TTL_HOURS = Number(process.env.RESET_TOKEN_TTL_HOURS || 24);
const SETUP_TTL_HOURS = Number(process.env.SETUP_TOKEN_TTL_HOURS || 72);

function mapUserResponse(user, token) {
  return {
    token,
    user: {
      accountId: user.id,
      role: user.role,
      profileId: user.profile_id,
      name: user.name,
      email: user.email || '',
      mustChangePassword: Boolean(user.must_change_password),
    },
  };
}

async function findUserByLogin(login) {
  const value = login.trim().toLowerCase();
  const direct = await pool.query(
    `SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1`,
    [value],
  );
  if (direct.rows[0]) return direct.rows[0];

  // Fiche agent mise à jour mais compte users pas encore synchronisé
  const viaAgent = await pool.query(
    `SELECT u.* FROM agents a
     INNER JOIN users u ON u.role = 'agent' AND u.profile_id = a.id
     WHERE LOWER(a.email) = $1`,
    [value],
  );
  return viaAgent.rows[0] ?? null;
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiants requis' });
    }

    const user = await findUserByLogin(username);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    if (user.setup_token && !user.reset_token) {
      return res.status(403).json({
        error: 'Compte non activé. Utilisez le lien reçu par email pour créer votre mot de passe.',
        needsSetup: true,
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = signToken(user);
    res.json(mapUserResponse(user, token));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.accountId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({
      user: {
        accountId: user.id,
        role: user.role,
        profileId: user.profile_id,
        name: user.name,
        email: user.email || '',
        mustChangePassword: Boolean(user.must_change_password),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/setup-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Token et mot de passe (8 caractères min.) requis' });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE setup_token = $1 AND setup_token_expires > NOW()`,
      [token],
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Lien invalide ou expiré' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users SET password_hash = $2, must_change_password = false,
       setup_token = NULL, setup_token_expires = NULL WHERE id = $1`,
      [user.id, hash],
    );

    const updated = { ...user, password_hash: hash, must_change_password: false };
    const jwt = signToken(updated);
    res.json(mapUserResponse(updated, jwt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Nouveau mot de passe requis (8 caractères min.)' });
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.accountId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    if (!user.must_change_password) {
      if (!currentPassword) return res.status(400).json({ error: 'Mot de passe actuel requis' });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users SET password_hash = $2, must_change_password = false WHERE id = $1`,
      [user.id, hash],
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email requis' });

    const user = await findUserByLogin(email);
    if (user) {
      // Toujours envoyer à l'adresse saisie (souvent l'email agent), pas un vieux @dirm.fr en base
      const deliveryTo = email.trim().toLowerCase();
      const needsSetup = Boolean(user.must_change_password || user.setup_token);

      await pool.query('UPDATE users SET email = $2 WHERE id = $1', [user.id, deliveryTo]);

      let mail;
      if (needsSetup) {
        const setupToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + SETUP_TTL_HOURS * 3600 * 1000);
        await pool.query(
          `UPDATE users SET setup_token = $2, setup_token_expires = $3, must_change_password = true,
           reset_token = NULL, reset_token_expires = NULL WHERE id = $1`,
          [user.id, setupToken, expires],
        );
        const setupUrl = `${FRONTEND_URL}/set-password?token=${setupToken}`;
        mail = setupPasswordEmail({
          name: user.name,
          username: deliveryTo,
          setupUrl,
          ttlHours: SETUP_TTL_HOURS,
        });
      } else {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + RESET_TTL_HOURS * 3600 * 1000);
        await pool.query(
          `UPDATE users SET reset_token = $2, reset_token_expires = $3,
           setup_token = NULL, setup_token_expires = NULL WHERE id = $1`,
          [user.id, resetToken, expires],
        );
        const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
        mail = resetPasswordEmail({ name: user.name, resetUrl, ttlHours: RESET_TTL_HOURS });
      }

      const result = await sendMail({ to: deliveryTo, ...mail });
      if (!result.sent && !result.skipped) {
        console.error(`Email auth ${deliveryTo}:`, result.error);
        return res.status(502).json({ error: `Échec envoi email : ${result.error || 'erreur inconnue'}` });
      }
    }

    res.json({ success: true, message: 'Si un compte existe, un email a été envoyé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Token et mot de passe (8 caractères min.) requis' });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token],
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Lien invalide ou expiré' });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users SET password_hash = $2, must_change_password = false,
       reset_token = NULL, reset_token_expires = NULL,
       setup_token = NULL, setup_token_expires = NULL WHERE id = $1`,
      [user.id, hash],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
