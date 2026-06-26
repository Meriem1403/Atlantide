import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { mapSubvention } from '../utils/mappers.js';
import { newId } from '../utils/tickets.js';
import { validateTicketAmounts } from '../utils/ticketAmounts.js';

const router = Router();
router.use(authenticateToken, requireRole('admin'));

function rejectInvalidAmounts(res, faceValue, subsidy) {
  const error = validateTicketAmounts(faceValue, subsidy);
  if (error) {
    res.status(400).json({ error });
    return true;
  }
  return false;
}

router.post('/', async (req, res) => {
  try {
    const { label, faceValue, subsidy, ticketsPerMonth, appliesTo, active = true } = req.body;
    if (rejectInvalidAmounts(res, faceValue, subsidy)) return;
    const id = newId();
    const result = await pool.query(
      `INSERT INTO subventions (id, label, face_value, subsidy, tickets_per_month, applies_to, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, label, faceValue, subsidy, ticketsPerMonth, JSON.stringify(appliesTo), active]
    );
    res.status(201).json(mapSubvention(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { label, faceValue, subsidy, ticketsPerMonth, appliesTo, active } = req.body;
    const current = await pool.query('SELECT * FROM subventions WHERE id = $1', [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ error: 'Subvention introuvable' });

    const row = current.rows[0];
    const nextFace = faceValue ?? row.face_value;
    const nextSubsidy = subsidy ?? row.subsidy;
    if (rejectInvalidAmounts(res, nextFace, nextSubsidy)) return;
    const result = await pool.query(
      `UPDATE subventions SET label = $2, face_value = $3, subsidy = $4, tickets_per_month = $5,
       applies_to = $6, active = $7 WHERE id = $1 RETURNING *`,
      [
        req.params.id,
        label ?? row.label,
        faceValue ?? row.face_value,
        subsidy ?? row.subsidy,
        ticketsPerMonth ?? row.tickets_per_month,
        JSON.stringify(appliesTo ?? (typeof row.applies_to === 'string' ? JSON.parse(row.applies_to) : row.applies_to)),
        active ?? row.active,
      ]
    );
    res.json(mapSubvention(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM subventions WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Subvention introuvable' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
