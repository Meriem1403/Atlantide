import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { mapAgent } from '../utils/mappers.js';
import { newId } from '../utils/tickets.js';
import { provisionAgentUser, syncAgentUserEmail } from '../services/userProvisioning.js';

const router = Router();
router.use(authenticateToken, requireRole('admin'));

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, department, email, phone, code, numerotation = '', notes = '', active = true } = req.body;
    const id = newId();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO agents (id, name, department, email, phone, code, numerotation, notes, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, name, department, email, phone, code, numerotation, notes, active]
    );
    if (active && email) {
      await provisionAgentUser(client, result.rows[0], { sendEmail: true });
    }
    await client.query('COMMIT');
    res.status(201).json(mapAgent(result.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, department, email, phone, code, numerotation, notes, active, resendSetupEmail } = req.body;
    const prev = await client.query('SELECT email FROM agents WHERE id = $1', [req.params.id]);
    const prevEmail = prev.rows[0]?.email?.trim().toLowerCase() ?? '';
    const nextEmail = email?.trim().toLowerCase() ?? prevEmail;
    const emailChanged = Boolean(email) && nextEmail !== prevEmail;

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE agents SET name = COALESCE($2,name), department = COALESCE($3,department),
       email = COALESCE($4,email), phone = COALESCE($5,phone), code = COALESCE($6,code),
       numerotation = COALESCE($7,numerotation), notes = COALESCE($8,notes),
       active = COALESCE($9,active) WHERE id = $1 RETURNING *`,
      [req.params.id, name, department, email, phone, code, numerotation, notes, active]
    );
    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Agent introuvable' });
    }

    const agent = result.rows[0];
    const sync = await syncAgentUserEmail(client, agent, {
      sendEmail: Boolean(resendSetupEmail) || emailChanged,
      forceResend: Boolean(resendSetupEmail),
    });
    await client.query('COMMIT');
    res.json({ ...mapAgent(agent), emailSync: sync });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  } finally {
    client.release();
  }
});

router.post('/:id/resend-setup-email', async (req, res) => {
  const client = await pool.connect();
  try {
    const agentRes = await client.query('SELECT * FROM agents WHERE id = $1', [req.params.id]);
    if (!agentRes.rows.length) return res.status(404).json({ error: 'Agent introuvable' });
    await client.query('BEGIN');
    const sync = await syncAgentUserEmail(client, agentRes.rows[0], { sendEmail: true, forceResend: true });
    await client.query('COMMIT');
    if (sync.emailResult && !sync.emailResult.sent && !sync.emailResult.skipped) {
      return res.status(502).json({
        error: `Échec envoi email : ${sync.emailResult.error || 'erreur inconnue'}`,
        ...sync,
      });
    }
    res.json({ success: true, ...sync });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Erreur serveur' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Agent introuvable' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
