import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { mapAgent } from '../utils/mappers.js';
import { newId } from '../utils/tickets.js';
import { provisionAgentUser } from '../services/userProvisioning.js';

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
  try {
    const { name, department, email, phone, code, numerotation, notes, active } = req.body;
    const result = await pool.query(
      `UPDATE agents SET name = COALESCE($2,name), department = COALESCE($3,department),
       email = COALESCE($4,email), phone = COALESCE($5,phone), code = COALESCE($6,code),
       numerotation = COALESCE($7,numerotation), notes = COALESCE($8,notes),
       active = COALESCE($9,active) WHERE id = $1 RETURNING *`,
      [req.params.id, name, department, email, phone, code, numerotation, notes, active]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Agent introuvable' });
    res.json(mapAgent(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
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
