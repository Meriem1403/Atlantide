import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { mapTicket } from '../utils/mappers.js';
import { generateForAgent } from '../services/ticketGeneration.js';
import { notifyTicketsGenerated, notifyTicketValidated } from '../services/notifications.js';
import { streamTicketsZip } from '../services/ticketZipExport.js';

const router = Router();

router.post('/export-zip', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { month, status = 'active', services, orgName, orgLogo } = req.body;
    if (!month || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'Mois et services requis' });
    }

    let branding = { orgName: orgName ?? '', orgLogo: orgLogo ?? '' };
    if (!branding.orgName) {
      const settings = await pool.query('SELECT org_name, org_logo FROM settings WHERE id = 1');
      branding = {
        orgName: settings.rows[0]?.org_name ?? 'DIRM Méditerranée',
        orgLogo: settings.rows[0]?.org_logo ?? '',
      };
    }

    await streamTicketsZip(res, {
      month,
      statusFilter: status,
      services,
      orgName: branding.orgName,
      orgLogo: branding.orgLogo,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur lors de l\'export ZIP' });
    }
  }
});

router.post('/generate', authenticateToken, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { agentId, month, count, faceValue, subsidy } = req.body;
    await client.query('BEGIN');
    const { agent, created } = await generateForAgent(client, { agentId, month, count, faceValue, subsidy });
    await client.query('COMMIT');
    notifyTicketsGenerated(agent, month, count).catch(console.error);
    res.status(201).json(created);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

router.post('/generate-batch', authenticateToken, requireRole('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { month, items } = req.body;
    if (!month || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Mois et liste d\'agents requis' });
    }

    await client.query('BEGIN');
    const allCreated = [];
    const summaries = [];

    for (const item of items) {
      const { agent, created } = await generateForAgent(client, {
        agentId: item.agentId,
        month,
        count: item.count,
        faceValue: item.faceValue,
        subsidy: item.subsidy,
      });
      allCreated.push(...created);
      summaries.push({ agentId: agent.id, agentName: agent.name, count: created.length });
      notifyTicketsGenerated(agent, month, created.length).catch(console.error);
    }

    await client.query('COMMIT');
    res.status(201).json({
      tickets: allCreated,
      summaries,
      totalTickets: allCreated.length,
      agentCount: summaries.length,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message, agentId: err.agentId });
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

router.patch('/:id/cancel', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE tickets SET status = 'cancelled' WHERE id = $1 AND status = 'active' RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ticket introuvable ou non annulable' });
    res.json(mapTicket(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Ticket introuvable' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/validate', authenticateToken, requireRole('provider'), async (req, res) => {
  try {
    const { ticketNumber } = req.body;
    const result = await pool.query(
      'SELECT * FROM tickets WHERE UPPER(number) = UPPER($1)',
      [ticketNumber.trim()]
    );

    if (!result.rows.length) {
      return res.json({ success: false, message: `Ticket "${ticketNumber}" introuvable.` });
    }

    const ticket = result.rows[0];
    if (ticket.status === 'used') {
      const usedAt = ticket.used_at ? new Date(ticket.used_at).toLocaleDateString('fr-FR') : '';
      return res.json({ success: false, message: `Déjà utilisé${usedAt ? ' le ' + usedAt : ''}.` });
    }
    if (ticket.status !== 'active') {
      const label = ticket.status === 'cancelled' ? 'annulé' : 'expiré';
      return res.json({ success: false, message: `Ticket ${label}.` });
    }

    const provider = await pool.query('SELECT name FROM providers WHERE id = $1', [req.user.profileId]);
    const providerName = provider.rows[0]?.name ?? req.user.name;

    const updated = await pool.query(
      `UPDATE tickets SET status = 'used', used_at = NOW(), provider_id = $2, provider_name = $3
       WHERE id = $1 RETURNING *`,
      [ticket.id, req.user.profileId, providerName]
    );

    const t = mapTicket(updated.rows[0]);
    notifyTicketValidated(t, providerName).catch(console.error);
    res.json({
      success: true,
      message: `${t.faceValue.toFixed(2)} € pour ${t.agentName} · Subvention: ${t.subsidy.toFixed(2)} €`,
      ticket: t,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
