import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { mapProvider } from '../utils/mappers.js';
import { newId } from '../utils/tickets.js';

const router = Router();
router.use(authenticateToken, requireRole('admin'));

router.post('/', async (req, res) => {
  try {
    const { name, address, siret, email, phone, active = true } = req.body;
    const id = newId();
    const result = await pool.query(
      `INSERT INTO providers (id, name, address, siret, email, phone, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, name, address, siret, email, phone, active]
    );
    res.status(201).json(mapProvider(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, address, siret, email, phone, active } = req.body;
    const result = await pool.query(
      `UPDATE providers SET name = COALESCE($2,name), address = COALESCE($3,address),
       siret = COALESCE($4,siret), email = COALESCE($5,email), phone = COALESCE($6,phone),
       active = COALESCE($7,active) WHERE id = $1 RETURNING *`,
      [req.params.id, name, address, siret, email, phone, active]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Prestataire introuvable' });
    res.json(mapProvider(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM providers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Prestataire introuvable' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
