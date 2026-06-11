import pool from '../src/config/database.js';
import { generateForAgent } from '../src/services/ticketGeneration.js';

const MONTH = process.env.TICKET_MONTH || '2026-07';

async function generateTicketsFromPlans() {
  const client = await pool.connect();

  try {
    const plans = await client.query(
      `SELECT p.*, a.name AS agent_name
       FROM agent_monthly_plans p
       JOIN agents a ON a.id = p.agent_id
       WHERE p.month = $1 AND p.ticket_count > 0
       ORDER BY p.service_name, a.name`,
      [MONTH]
    );

    if (!plans.rows.length) {
      console.log(`Aucun plan mensuel avec tickets pour ${MONTH}.`);
      return;
    }

    const expected = plans.rows.reduce((s, r) => s + r.ticket_count, 0);
    console.log(`Génération des tickets pour ${MONTH}…`);
    console.log(`→ ${plans.rows.length} agents, ${expected} tickets attendus`);

    await client.query('BEGIN');

    let totalCreated = 0;
    const summaries = [];

    for (const plan of plans.rows) {
      const { agent, created } = await generateForAgent(client, {
        agentId: plan.agent_id,
        month: plan.month,
        count: plan.ticket_count,
        faceValue: Number(plan.face_value),
        subsidy: Number(plan.subsidy),
      });
      totalCreated += created.length;
      summaries.push({
        agent: agent.name,
        service: plan.service_name,
        count: created.length,
        faceValue: Number(plan.face_value),
      });
      console.log(`  ✓ ${agent.name} (${plan.service_name}) — ${created.length} tickets`);
    }

    await client.query('COMMIT');
    console.log(`\nTerminé : ${totalCreated} tickets générés pour ${summaries.length} agents (${MONTH}).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

generateTicketsFromPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
