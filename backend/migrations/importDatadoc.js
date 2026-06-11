import bcrypt from 'bcryptjs';
import pool from '../src/config/database.js';
import { loadDatadocFiles, agentCode, getDatadocDir } from '../src/utils/odsParser.js';
import { newId } from '../src/utils/tickets.js';
import { provisionAgentUser, provisionProviderUser } from '../src/services/userProvisioning.js';

const ORG_NAME = process.env.ORG_NAME || 'Ministère chargé de la Mer et de la Pêche';

function slugify(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function importDatadoc() {
  const data = await loadDatadocFiles();
  const client = await pool.connect();

  console.log(`Import depuis ${data.dir}`);
  console.log(`→ ${data.providers.length} prestataires, ${data.agents.length} allocations agents (${data.month})`);

  try {
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE provider_invoices, tickets, agent_monthly_plans, users, subventions, providers, agents RESTART IDENTITY CASCADE
    `);

    await client.query(
      `UPDATE settings SET org_name = $1, notification_email = COALESCE(NULLIF(notification_email, ''), 'compta@dirm.fr') WHERE id = 1`,
      [ORG_NAME]
    );

    const providerIds = new Map();
    for (const p of data.providers) {
      const id = newId();
      providerIds.set(p.name, id);
      await client.query(
        `INSERT INTO providers (id, name, address, siret, email, phone, active)
         VALUES ($1,$2,$3,'',$4,$5,true)`,
        [id, p.name, p.address || p.city, `contact@${slugify(p.name)}.fr`, p.phone]
      );
    }

    const agentIds = new Map();
    const subventionTiers = new Map();

    for (const a of data.agents) {
      const key = `${a.name}|${a.service}`;
      let agentId = agentIds.get(key);
      if (!agentId) {
        agentId = newId();
        agentIds.set(key, agentId);
        const code = agentCode(a.name);
        await client.query(
          `INSERT INTO agents (id, name, department, email, phone, code, numerotation, notes, active)
           VALUES ($1,$2,$3,$4,'',$5,$6,$7,true)`,
          [
            agentId,
            a.name,
            a.service,
            `${slugify(a.name.split(' ')[0])}.${slugify(agentCode(a.name))}@dirm.fr`,
            code,
            a.numerotation || '',
            a.notes || '',
          ]
        );
      }

      await client.query(
        `INSERT INTO agent_monthly_plans (id, agent_id, month, service_name, ticket_count, face_value, subsidy, numerotation, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (agent_id, month) DO UPDATE SET
           service_name = EXCLUDED.service_name,
           ticket_count = EXCLUDED.ticket_count,
           face_value = EXCLUDED.face_value,
           subsidy = EXCLUDED.subsidy,
           numerotation = EXCLUDED.numerotation,
           notes = EXCLUDED.notes`,
        [newId(), agentId, a.month, a.service, a.ticketCount, a.faceValue, a.subsidy, a.numerotation || '', a.notes || '']
      );

      const tierKey = `${a.faceValue}-${a.subsidy}`;
      if (!subventionTiers.has(tierKey)) {
        subventionTiers.set(tierKey, { faceValue: a.faceValue, subsidy: a.subsidy });
      }
    }

    let si = 0;
    for (const [, tier] of subventionTiers) {
      await client.query(
        `INSERT INTO subventions (id, label, face_value, subsidy, tickets_per_month, applies_to, active)
         VALUES ($1,$2,$3,$4,23,$5,true)`,
        [newId(), `Barème ${tier.faceValue}€ — ${data.month}`, tier.faceValue, tier.subsidy, JSON.stringify('all')]
      );
      si += 1;
    }

    const adminHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (id, username, password_hash, role, profile_id, name)
       VALUES ('u-admin',$1,$2,'admin','admin','Service Comptabilité DIRM')`,
      ['admin', adminHash]
    );

    const sendSetupEmail = process.env.SEND_SETUP_EMAIL !== 'false';
    for (const [, agentId] of agentIds) {
      const agentRow = await client.query('SELECT * FROM agents WHERE id = $1', [agentId]);
      await provisionAgentUser(client, agentRow.rows[0], { sendEmail: sendSetupEmail });
    }

    for (const [, id] of providerIds) {
      const providerRow = await client.query('SELECT * FROM providers WHERE id = $1', [id]);
      await provisionProviderUser(client, providerRow.rows[0], { sendEmail: false });
    }

    await client.query('COMMIT');
    console.log(`Import terminé : ${providerIds.size} prestataires, ${agentIds.size} agents, ${subventionTiers.size} barèmes.`);
    console.log(`Mois de référence : ${data.month}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importDatadoc().catch((err) => {
  console.error(err);
  process.exit(1);
});
