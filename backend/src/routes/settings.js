import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendMail, verifyEmail } from '../services/email.js';
import { setupPasswordEmail } from '../services/emailTemplates.js';
import { APP_NAME } from '../config/branding.js';

const router = Router();

router.put('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { orgName, orgLogo, notificationEmail, mailFrom } = req.body;
    const result = await pool.query(
      `UPDATE settings SET
         org_name = COALESCE($1, org_name),
         org_logo = COALESCE($2, org_logo),
         notification_email = COALESCE($3, notification_email),
         mail_from = COALESCE($4, mail_from)
       WHERE id = 1
       RETURNING org_name, org_logo, notification_email, mail_from`,
      [orgName, orgLogo ?? null, notificationEmail ?? null, mailFrom ?? null]
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

    const verify = await verifyEmail();
    if (!verify.ok) return res.status(400).json({ error: verify.error });

    const mail = setupPasswordEmail({
      name: 'Test',
      username: to,
      setupUrl: `${process.env.FRONTEND_URL || 'https://atlantide.netlify.app'}/set-password?token=test`,
      ttlHours: 72,
    });
    const result = await sendMail({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      transactional: true,
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
