/**
 * Corrige POIRIER Marie Anne — septembre 2026 : service SEF, subvention 3 €.
 * Usage : node migrations/fixPoirierSeptember2026.js
 */
import pool from '../src/config/database.js';
import { generateForAgent } from '../src/services/ticketGeneration.js';

const MONTH = '2026-09';
const SERVICE = 'SEF (service emploi formation)';
const DEPARTMENT = 'SEF';
const FACE_VALUE = 3;
const SUBSIDY = 3;
const TICKET_COUNT = 23;

async function fixPoirier() {
  const client = await pool.connect();
  try {
    const agentRes = await client.query(
      `SELECT * FROM agents WHERE name ILIKE '%POIRIER Marie Anne%' LIMIT 1`,
    );
    if (!agentRes.rows.length) throw new Error('POIRIER Marie Anne introuvable');
    const agent = agentRes.rows[0];

    await client.query('BEGIN');

    await client.query(
      `UPDATE agents SET department = $2, notes = $3 WHERE id = $1`,
      [agent.id, DEPARTMENT, 'SEF — remplace GOGEON BRUNO (septembre 2026)'],
    );

    await client.query(
      `UPDATE agent_monthly_plans
       SET service_name = $3, face_value = $4, subsidy = $5, ticket_count = $6, notes = $7
       WHERE agent_id = $1 AND month = $2`,
      [agent.id, MONTH, SERVICE, FACE_VALUE, SUBSIDY, TICKET_COUNT, 'SEF — service emploi formation'],
    );

    const { created } = await generateForAgent(client, {
      agentId: agent.id,
      month: MONTH,
      count: TICKET_COUNT,
      faceValue: FACE_VALUE,
      subsidy: SUBSIDY,
    });

    await client.query('COMMIT');
    console.log(`✓ ${agent.name} — ${SERVICE}`);
    console.log(`  ${created.length} tickets régénérés (${FACE_VALUE} € / subv. ${SUBSIDY} €)`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

fixPoirier().catch((err) => {
  console.error(err);
  process.exit(1);
});
