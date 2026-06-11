import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { mapInvoice } from '../utils/mappers.js';
import { newId } from '../utils/tickets.js';
import { notifyInvoiceSubmitted, notifyInvoiceReviewed } from '../services/notifications.js';

const router = Router();

router.post('/', authenticateToken, requireRole('provider'), async (req, res) => {
  try {
    const {
      month, ticketCount, totalAmount, subsidyAmount,
      invoiceNumber, notes, fileName, fileData,
    } = req.body;

    const id = newId();
    const result = await pool.query(
      `INSERT INTO provider_invoices (id, provider_id, provider_name, month, ticket_count,
        total_amount, subsidy_amount, invoice_number, notes, file_name, file_data, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'submitted') RETURNING *`,
      [id, req.user.profileId, req.user.name, month, ticketCount, totalAmount, subsidyAmount,
        invoiceNumber, notes ?? '', fileName ?? '', fileData ?? '']
    );
    const invoice = mapInvoice(result.rows[0]);
    notifyInvoiceSubmitted(invoice).catch(console.error);
    res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:id/approve', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { note = '' } = req.body;
    const result = await pool.query(
      `UPDATE provider_invoices SET status = 'approved', reviewed_at = NOW(), review_note = $2
       WHERE id = $1 AND status = 'submitted' RETURNING *`,
      [req.params.id, note]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Facture introuvable' });
    const invoice = mapInvoice(result.rows[0]);
    notifyInvoiceReviewed(invoice, 'approved').catch(console.error);
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/:id/reject', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { note = '' } = req.body;
    const result = await pool.query(
      `UPDATE provider_invoices SET status = 'rejected', reviewed_at = NOW(), review_note = $2
       WHERE id = $1 AND status = 'submitted' RETURNING *`,
      [req.params.id, note]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Facture introuvable' });
    const invoice = mapInvoice(result.rows[0]);
    notifyInvoiceReviewed(invoice, 'rejected').catch(console.error);
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
