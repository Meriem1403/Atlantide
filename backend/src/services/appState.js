import pool from '../config/database.js';
import {
  mapAgent, mapProvider, mapSubvention, mapTicket, mapInvoice, mapMonthlyPlan,
} from '../utils/mappers.js';

export async function loadAppState(user) {
  const settings = await pool.query('SELECT org_name, org_logo, notification_email FROM settings WHERE id = 1');
  const orgName = settings.rows[0]?.org_name ?? 'Mairie de Paris';
  const orgLogo = settings.rows[0]?.org_logo ?? '';
  const notificationEmail = settings.rows[0]?.notification_email ?? '';

  if (user.role === 'admin') {
    const [agents, providers, subventions, tickets, invoices, plans] = await Promise.all([
      pool.query('SELECT * FROM agents ORDER BY name'),
      pool.query('SELECT * FROM providers ORDER BY name'),
      pool.query('SELECT * FROM subventions ORDER BY created_at'),
      pool.query('SELECT * FROM tickets ORDER BY generated_at DESC'),
      pool.query('SELECT * FROM provider_invoices ORDER BY submitted_at DESC'),
      pool.query(
        `SELECT p.*, a.name AS agent_name FROM agent_monthly_plans p
         JOIN agents a ON a.id = p.agent_id ORDER BY p.month DESC, p.service_name, a.name`
      ),
    ]);

    return {
      users: [],
      agents: agents.rows.map(mapAgent),
      providers: providers.rows.map(mapProvider),
      subventions: subventions.rows.map(mapSubvention),
      tickets: tickets.rows.map(mapTicket),
      providerInvoices: invoices.rows.map(mapInvoice),
      monthlyPlans: plans.rows.map(mapMonthlyPlan),
      orgName,
      orgLogo,
      notificationEmail,
    };
  }

  if (user.role === 'agent') {
    const [tickets, agent] = await Promise.all([
      pool.query(
        'SELECT * FROM tickets WHERE agent_id = $1 ORDER BY month DESC, generated_at DESC',
        [user.profileId],
      ),
      pool.query('SELECT * FROM agents WHERE id = $1', [user.profileId]),
    ]);
    return {
      users: [],
      agents: agent.rows.map(mapAgent),
      providers: [],
      subventions: [],
      tickets: tickets.rows.map(mapTicket),
      providerInvoices: [],
      orgName,
      orgLogo,
    };
  }

  const [tickets, invoices] = await Promise.all([
    pool.query('SELECT * FROM tickets WHERE provider_id = $1 ORDER BY used_at DESC', [user.profileId]),
    pool.query('SELECT * FROM provider_invoices WHERE provider_id = $1 ORDER BY submitted_at DESC', [user.profileId]),
  ]);

  return {
    users: [],
    agents: [],
    providers: [],
    subventions: [],
    tickets: tickets.rows.map(mapTicket),
    providerInvoices: invoices.rows.map(mapInvoice),
    orgName,
    orgLogo,
  };
}
