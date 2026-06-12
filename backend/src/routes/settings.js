import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendMail, verifySmtp } from '../services/email.js';
import { APP_NAME } from '../config/branding.js';

const router = Router();

router.put('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { orgName, orgLogo, notificationEmail, mailFrom } = req.body;
    const result = await pool.query(
      `UPDATE settings SET
         org_name = COALESCE($2, org_name),
         org_logo = COALESCE($3, org_logo),
         notification_email = COALESCE($4, notification_email),
         mail_from = COALESCE($5, mail_from)
       WHERE id = 1
       RETURNING org_name, org_logo, notification_email, mail_from`,
      [1, orgName, orgLogo, notificationEmail ?? null, mailFrom ?? null]
    );
    res.json({
      orgName: result.rows[0].org_name,
      orgLogo: result.rows[0].org_logo,
      notificationEmail: result.rows[0].notification_email,
      mailFrom: result.rows[0].mail_from,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/test-email', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const to = (req.body?.to || '').trim();
    if (!to) return res.status(400).json({ error: 'Adresse destinataire requise (to)' });

    const verify = await verifySmtp();
    if (!verify.ok) return res.status(400).json({ error: verify.error });

    const result = await sendMail({
      to,
      subject: `Test email — ${APP_NAME}`,
      text: `Ceci est un email de test envoyé depuis ${APP_NAME}. Si vous le recevez, la configuration SMTP est correcte.`,
    });
    if (!result.sent) {
      return res.status(502).json({ error: result.error || 'Échec envoi', result });
    }
    res.json({ success: true, to });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
});

export default router;
