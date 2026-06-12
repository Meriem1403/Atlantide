import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authenticateToken, signToken } from '../middleware/auth.js';
import { sendMail } from '../services/email.js';
import { resetPasswordEmail } from '../services/emailTemplates.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RESET_TTL_HOURS = Number(process.env.RESET_TOKEN_TTL_HOURS || 24);

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
  const result = await pool.query(
    `SELECT * FROM users WHERE LOWER(username) = $1 OR LOWER(email) = $1`,
    [value],
  );
  return result.rows[0] ?? null;
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
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + RESET_TTL_HOURS * 3600 * 1000);
      await pool.query(
        `UPDATE users SET reset_token = $2, reset_token_expires = $3 WHERE id = $1`,
        [user.id, resetToken, expires],
      );
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
      const mail = resetPasswordEmail({ name: user.name, resetUrl, ttlHours: RESET_TTL_HOURS });
      const to = user.email || user.username;
      const result = await sendMail({ to, ...mail });
      if (!result.sent && !result.skipped) {
        console.error(`Email reset ${to}:`, result.error);
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
