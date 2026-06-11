import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = Router();

router.put('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { orgName, orgLogo, notificationEmail } = req.body;
    const result = await pool.query(
      `UPDATE settings SET org_name = COALESCE($2, org_name), org_logo = COALESCE($3, org_logo),
       notification_email = COALESCE($4, notification_email)
       WHERE id = 1 RETURNING org_name, org_logo, notification_email`,
      [1, orgName, orgLogo, notificationEmail]
    );
    res.json({
      orgName: result.rows[0].org_name,
      orgLogo: result.rows[0].org_logo,
      notificationEmail: result.rows[0].notification_email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
