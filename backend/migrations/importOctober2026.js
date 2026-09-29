/**
 * Importe les plans mensuels d'octobre 2026 depuis le fichier ODS (sans écraser la base).
 * Usage : node migrations/importOctober2026.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';
import { readOdsSheets, parseAgentsSheet, parseEuro, agentCode } from '../src/utils/odsParser.js';
import { newId } from '../src/utils/tickets.js';
import { provisionAgentUser } from '../src/services/userProvisioning.js';

const MONTH = '2026-10';
const TICKETS_PER_AGENT = 23;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ODS_FILE = path.resolve(__dirname, '../../datadoc/calcul des tickets repas Octobre 2026.ods');

const SUBSIDY_OVERRIDES = new Map([
  ['POIRIER Marie Anne', { faceValue: 3, subsidy: 3 }],
]);

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function serviceFromSheetName(sheetName) {
  const n = sheetName.trim().toUpperCase();
  if (n.includes('SEF')) return 'SEF (service emploi formation)';
  if (n.startsWith('SPB13')) return 'SPB13';
  if (n.startsWith('SPB2A')) return 'SPB2A';
  if (n.startsWith('SPB2B')) return 'SPB2B';
  if (n.includes('CROSS CORSE')) return 'CROSS CORSE';
  if (n.includes('CSN MARTIGUES')) return 'CSN MARTIGUES';
  if (n.includes('CSN CORSE') || n.includes('CSN-SEF')) return 'CSN-SEF- SSGM-CROSS CORSE';
  return sheetName.replace(/\s*OCT.*$/i, '').trim();
}

function parseAgentsFromSheet(sheetName, rows) {
  const service = serviceFromSheetName(sheetName);
  const parsed = parseAgentsSheet(sheetName, rows);
  const agents = [];

  for (const cells of rows) {
    const nonEmpty = cells.map((c) => c.trim()).filter(Boolean);
    if (nonEmpty.length < 2) continue;
    let nameIdx = 0;
    if (!cells[0]?.trim() && cells[1]?.trim()) nameIdx = 1;
    const name = (cells[nameIdx] || '').trim();
    if (!name || /^(SERVICE|TOTAL|CALCUL|AGENTS DONT|\*)/i.test(name)) continue;

    const ticketRaw = (cells[nameIdx + 1] || '').trim();
    const ticketCount = parseInt(ticketRaw, 10);
    if (!Number.isFinite(ticketCount)) continue;

    let faceValue = null;
    for (let i = cells.length - 1; i >= nameIdx + 2; i--) {
      const euro = parseEuro(cells[i]);
      if (euro !== null) {
        faceValue = euro;
        break;
      }
    }
    if (faceValue === null) faceValue = parsed.agents.find((a) => normalizeName(a.name) === normalizeName(name))?.faceValue ?? 5;

    let subsidy = Math.round(faceValue * 0.6 * 100) / 100;
    const override = SUBSIDY_OVERRIDES.get(name) || [...SUBSIDY_OVERRIDES.entries()].find(([k]) => normalizeName(k) === normalizeName(name))?.[1];
    if (override) {
      faceValue = override.faceValue;
      subsidy = override.subsidy;
    }

    agents.push({
      name: name.replace(/\s+/g, ' '),
      service,
      month: MONTH,
      ticketCount: TICKETS_PER_AGENT,
      faceValue,
      subsidy,
      numerotation: '',
      notes: '',
    });
  }

  return { service, agents };
}

async function findAgent(client, name) {
  const norm = normalizeName(name);
  const all = await client.query('SELECT * FROM agents');
  let best = all.rows.find((a) => normalizeName(a.name) === norm);
  if (best) return best;

  const token = norm.split(' ')[0];
  const candidates = all.rows.filter((a) => normalizeName(a.name).includes(token));
  if (candidates.length === 1) return candidates[0];
  return candidates.find((a) => {
    const an = normalizeName(a.name);
    return norm.split(' ').every((part) => part.length > 2 && an.includes(part));
  }) ?? null;
}

async function importOctober() {
  if (!fs.existsSync(ODS_FILE)) throw new Error(`Fichier introuvable : ${ODS_FILE}`);

  const sheets = await readOdsSheets(ODS_FILE);
  const allAgents = sheets.flatMap((s) => parseAgentsFromSheet(s.name, s.rows).agents);

  console.log(`→ ${allAgents.length} lignes agents lues (${MONTH})`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let updated = 0;
    let created = 0;

    for (const row of allAgents) {
      let agent = await findAgent(client, row.name);
      if (!agent) {
        const id = newId();
        const code = agentCode(row.name);
        const email = `${code.toLowerCase()}@dirm.fr`;
        const insert = await client.query(
          `INSERT INTO agents (id, name, department, email, phone, code, numerotation, notes, active)
           VALUES ($1,$2,$3,$4,'',$5,'','',true) RETURNING *`,
          [id, row.name, row.service, email, code],
        );
        agent = insert.rows[0];
        await provisionAgentUser(client, agent, { sendEmail: false });
        created += 1;
        console.log(`  + Nouvel agent : ${row.name}`);
      } else if (agent.department !== row.service) {
        await client.query('UPDATE agents SET department = $2 WHERE id = $1', [agent.id, row.service]);
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
        [newId(), agent.id, MONTH, row.service, row.ticketCount, row.faceValue, row.subsidy, '', ''],
      );
      updated += 1;
    }

    await client.query('COMMIT');
    console.log(`\nImport ${MONTH} terminé : ${updated} plans, ${created} agent(s) créé(s).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

importOctober().catch((err) => {
  console.error(err);
  process.exit(1);
});
