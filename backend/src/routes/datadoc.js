import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { loadDatadocFiles } from '../utils/odsParser.js';
import { mapAgent, mapProvider } from '../utils/mappers.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.use(authenticateToken, requireRole('admin'));

router.get('/preview', async (_req, res) => {
  try {
    const data = await loadDatadocFiles();
    res.json({
      month: data.month,
      providerCount: data.providers.length,
      agentCount: data.agents.length,
      services: data.services.map((s) => ({
        name: s.service,
        agentCount: s.agents.length,
        totalTickets: s.agents.reduce((n, a) => n + a.ticketCount, 0),
      })),
      providers: data.providers,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/report', async (req, res) => {
  try {
    const month = req.query.month || '2026-07';
    const settings = await pool.query('SELECT org_name, org_logo FROM settings WHERE id = 1');
    const plans = await pool.query(
      `SELECT p.*, a.name AS agent_name, a.department, a.code, a.email
       FROM agent_monthly_plans p
       JOIN agents a ON a.id = p.agent_id
       WHERE p.month = $1
       ORDER BY p.service_name, a.name`,
      [month]
    );
    const providers = await pool.query('SELECT * FROM providers ORDER BY name');

    const byService = {};
    for (const row of plans.rows) {
      const svc = row.service_name || row.department || 'Sans service';
      if (!byService[svc]) {
        byService[svc] = { name: svc, agents: [], totalTickets: 0, defaultTicketCount: 23 };
      }
      byService[svc].agents.push({
        agentId: row.agent_id,
        name: row.agent_name,
        department: row.department,
        code: row.code,
        email: row.email,
        ticketCount: row.ticket_count,
        numerotation: row.numerotation || '',
        faceValue: Number(row.face_value),
        subsidy: Number(row.subsidy),
        notes: row.notes || '',
      });
      byService[svc].totalTickets += row.ticket_count;
    }

    res.json({
      month,
      monthLabel: new Date(`${month}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      orgName: settings.rows[0]?.org_name ?? '',
      orgLogo: settings.rows[0]?.org_logo ?? '',
      services: Object.values(byService),
      providers: providers.rows.map(mapProvider),
      totals: {
        agents: plans.rows.length,
        tickets: plans.rows.reduce((s, r) => s + r.ticket_count, 0),
        providers: providers.rows.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/import', async (_req, res) => {
  try {
    const script = path.resolve(__dirname, '../../migrations/importDatadoc.js');
    const { stdout, stderr } = await execFileAsync('node', [script], {
      env: { ...process.env },
      cwd: path.resolve(__dirname, '../..'),
    });
    res.json({ success: true, output: stdout, warnings: stderr });
  } catch (err) {
    res.status(500).json({ error: err.message, output: err.stdout, stderr: err.stderr });
  }
});

export default router;
