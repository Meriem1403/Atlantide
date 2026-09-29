/**
 * Prépare septembre 2026 : agents + plans mensuels.
 * Usage : TICKET_MONTH=2026-09 node migrations/setupSeptember2026.js
 *         (setup only, no ticket generation — use generateTicketsFromPlans.js after)
 */
import pool from '../src/config/database.js';
import { newId } from '../src/utils/tickets.js';
import { provisionAgentUser } from '../src/services/userProvisioning.js';

const MONTH = '2026-09';
const SOURCE_MONTH = '2026-08';

const AGENT_UPDATES = [
  {
    match: 'GOGEON BRUNO',
    patch: { active: false, notes: 'RETRAITE — inactif depuis septembre 2026' },
  },
  {
    match: 'DUFAY Clara',
    patch: { active: false, notes: 'Remplacée par LAVIALLE Clémence — septembre 2026' },
  },
  {
    match: 'POIRIER Marie Anne',
    patch: {
      department: 'SEF',
      notes: 'SEF — remplace GOGEON BRUNO — septembre 2026',
    },
  },
  {
    match: 'PESCIA- BROCHIER Manon',
    patch: { notes: '' },
  },
];

const NEW_AGENTS = [
  {
    name: 'LAVIALLE Clémence (cross corse)',
    department: 'CROSS CORSE',
    email: 'lavialle@dirm.fr',
    phone: '',
    code: 'LAVCLE',
    numerotation: '',
    notes: 'Remplace DUFAY Clara — septembre 2026',
    active: true,
    plan: {
      serviceName: 'CROSS CORSE',
      ticketCount: 23,
      faceValue: 3,
      subsidy: 1.8,
      numerotation: '',
      notes: 'Remplace DUFAY Clara',
    },
  },
  {
    name: 'CULIOLI Sebastien – bonifacio',
    department: 'SPB2A',
    email: 'culioli@dirm.fr',
    phone: '',
    code: 'CULBON',
    numerotation: '',
    notes: 'SPB2A Bonifacio — septembre 2026',
    active: true,
    plan: {
      serviceName: 'SPB2A',
      ticketCount: 23,
      faceValue: 4.5,
      subsidy: 2.7,
      numerotation: '',
      notes: '',
    },
  },
];

async function findAgent(client, fragment) {
  const res = await client.query(
    `SELECT * FROM agents WHERE name ILIKE $1 LIMIT 1`,
    [`%${fragment}%`],
  );
  return res.rows[0] ?? null;
}

async function setupSeptember() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { match, patch } of AGENT_UPDATES) {
      const agent = await findAgent(client, match);
      if (!agent) throw new Error(`Agent introuvable : ${match}`);
      await client.query(
        `UPDATE agents SET
           department = COALESCE($2, department),
           notes = COALESCE($3, notes),
           active = COALESCE($4, active)
         WHERE id = $1`,
        [
          agent.id,
          patch.department ?? null,
          patch.notes ?? null,
          patch.active ?? null,
        ],
      );
      console.log(`✓ Agent mis à jour : ${agent.name}`);
    }

    const createdAgents = [];
    for (const spec of NEW_AGENTS) {
      const existing = await findAgent(client, spec.name.split(' ')[0]);
      if (existing && existing.name.toLowerCase().includes(spec.name.split(' ')[0].toLowerCase())) {
        console.log(`→ Agent déjà présent : ${existing.name}`);
        createdAgents.push({ spec, id: existing.id });
        continue;
      }
      const id = newId();
      const result = await client.query(
        `INSERT INTO agents (id, name, department, email, phone, code, numerotation, notes, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [id, spec.name, spec.department, spec.email, spec.phone, spec.code, spec.numerotation, spec.notes, spec.active],
      );
      if (spec.active && spec.email) {
        await provisionAgentUser(client, result.rows[0], { sendEmail: false });
      }
      console.log(`✓ Nouvel agent : ${spec.name}`);
      createdAgents.push({ spec, id });
    }

    await client.query('DELETE FROM agent_monthly_plans WHERE month = $1', [MONTH]);

    const sourcePlans = await client.query(
      `SELECT p.*, a.name AS agent_name, a.active AS agent_active
       FROM agent_monthly_plans p
       JOIN agents a ON a.id = p.agent_id
       WHERE p.month = $1`,
      [SOURCE_MONTH],
    );

    if (!sourcePlans.rows.length) {
      throw new Error(`Aucun plan source pour ${SOURCE_MONTH}`);
    }

    const gogeon = await findAgent(client, 'GOGEON BRUNO');
    const dufay = await findAgent(client, 'DUFAY Clara');
    const poirier = await findAgent(client, 'POIRIER Marie Anne');
    const pescia = await findAgent(client, 'PESCIA');

    for (const row of sourcePlans.rows) {
      let ticketCount = row.ticket_count;
      let faceValue = Number(row.face_value);
      let subsidy = Number(row.subsidy);
      let serviceName = row.service_name;
      let notes = row.notes || '';

      if (row.agent_id === gogeon?.id) {
        ticketCount = 0;
        notes = 'RETRAITE — inactif';
      } else if (row.agent_id === dufay?.id) {
        ticketCount = 0;
        notes = 'Remplacée par LAVIALLE Clémence';
      } else if (row.agent_id === poirier?.id) {
        serviceName = 'SEF (service emploi formation)';
        ticketCount = 23;
        faceValue = 3;
        subsidy = 3;
        notes = 'SEF — service emploi formation';
      } else if (row.agent_id === pescia?.id) {
        ticketCount = 23;
        notes = '';
      }

      if (!row.agent_active && row.agent_id !== gogeon?.id && row.agent_id !== dufay?.id) {
        ticketCount = 0;
      }

      await client.query(
        `INSERT INTO agent_monthly_plans (id, agent_id, month, service_name, ticket_count, face_value, subsidy, numerotation, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [newId(), row.agent_id, MONTH, serviceName, ticketCount, faceValue, subsidy, row.numerotation || '', notes],
      );
    }

    for (const { spec, id } of createdAgents) {
      const dup = await client.query(
        'SELECT id FROM agent_monthly_plans WHERE agent_id = $1 AND month = $2',
        [id, MONTH],
      );
      if (dup.rows.length) continue;
      await client.query(
        `INSERT INTO agent_monthly_plans (id, agent_id, month, service_name, ticket_count, face_value, subsidy, numerotation, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          newId(), id, MONTH, spec.plan.serviceName, spec.plan.ticketCount,
          spec.plan.faceValue, spec.plan.subsidy, spec.plan.numerotation, spec.plan.notes,
        ],
      );
      console.log(`✓ Plan ${MONTH} : ${spec.name}`);
    }

    const summary = await client.query(
      `SELECT COUNT(*)::int AS agents, COALESCE(SUM(ticket_count),0)::int AS tickets
       FROM agent_monthly_plans WHERE month = $1`,
      [MONTH],
    );

    await client.query('COMMIT');
    console.log(`\nPlans ${MONTH} : ${summary.rows[0].agents} agents, ${summary.rows[0].tickets} tickets prévus.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

setupSeptember().catch((err) => {
  console.error(err);
  process.exit(1);
});
