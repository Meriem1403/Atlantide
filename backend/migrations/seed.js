import bcrypt from 'bcryptjs';
import pool from '../src/config/database.js';
import { generateSecureTicketNumber } from '../src/utils/tickets.js';

const now = new Date().toISOString();

const agents = [
  { id: 'ag1', name: 'Marie Dubois', department: 'Direction RH', email: 'm.dubois@mairie.fr', phone: '01 23 45 67 89', code: 'DUB' },
  { id: 'ag2', name: 'Thomas Martin', department: 'Service Technique', email: 't.martin@mairie.fr', phone: '01 23 45 67 90', code: 'MAR' },
  { id: 'ag3', name: 'Sophie Leroy', department: 'Comptabilité', email: 's.leroy@mairie.fr', phone: '01 23 45 67 91', code: 'LER' },
  { id: 'ag4', name: 'Lucas Bernard', department: 'Direction Informatique', email: 'l.bernard@mairie.fr', phone: '01 23 45 67 92', code: 'BER' },
  { id: 'ag5', name: 'Emma Petit', department: 'Communication', email: 'e.petit@mairie.fr', phone: '01 23 45 67 93', code: 'PET' },
];

const providers = [
  { id: 'pv1', name: 'La Bonne Fourchette', address: '12 rue du Commerce, 75015 Paris', siret: '123 456 789 00012', email: 'contact@labonnefourchette.fr', phone: '01 45 67 89 01' },
  { id: 'pv2', name: 'Le Midi Express', address: '8 av. de la République, 75011 Paris', siret: '987 654 321 00098', email: 'contact@lemidiexpress.fr', phone: '01 45 67 89 02' },
];

const subventions = [
  { id: 'sv1', label: 'Standard 2026', faceValue: 9.0, subsidy: 5.4, ticketsPerMonth: 22, appliesTo: 'all', active: true },
  { id: 'sv2', label: 'Cadres 2026', faceValue: 11.0, subsidy: 6.6, ticketsPerMonth: 22, appliesTo: ['ag3', 'ag4'], active: false },
];

const users = [
  { id: 'u0', username: 'admin', password: 'admin123', role: 'admin', profileId: 'admin', name: 'Service Comptabilité' },
  { id: 'u1', username: 'm.dubois', password: 'marie2026', role: 'agent', profileId: 'ag1', name: 'Marie Dubois' },
  { id: 'u2', username: 't.martin', password: 'thomas2026', role: 'agent', profileId: 'ag2', name: 'Thomas Martin' },
  { id: 'u3', username: 's.leroy', password: 'sophie2026', role: 'agent', profileId: 'ag3', name: 'Sophie Leroy' },
  { id: 'u4', username: 'l.bernard', password: 'lucas2026', role: 'agent', profileId: 'ag4', name: 'Lucas Bernard' },
  { id: 'u5', username: 'e.petit', password: 'emma2026', role: 'agent', profileId: 'ag5', name: 'Emma Petit' },
  { id: 'u6', username: 'lafourchette', password: 'prest123', role: 'provider', profileId: 'pv1', name: 'La Bonne Fourchette' },
  { id: 'u7', username: 'midiexpress', password: 'prest456', role: 'provider', profileId: 'pv2', name: 'Le Midi Express' },
];

function makeTickets(months, faceValue = 9.0, subsidy = 5.4, count = 22) {
  const tickets = [];
  for (const agent of agents) {
    for (const { m, usedRatio } of months) {
      const usedCount = Math.round(count * usedRatio);
      for (let i = 1; i <= count; i++) {
        const number = generateSecureTicketNumber();
        const isUsed = i <= usedCount;
        const genDate = new Date(`${m}-01T08:00:00`);
        const usedDate = isUsed ? new Date(genDate.getTime() + i * 1.1 * 86400000) : null;
        tickets.push({
          id: `${agent.id}-${m}-${number}`,
          number,
          agentId: agent.id,
          agentName: agent.name,
          month: m,
          faceValue,
          subsidy,
          agentContribution: Math.round((faceValue - subsidy) * 100) / 100,
          status: isUsed ? 'used' : 'active',
          generatedAt: genDate,
          usedAt: usedDate,
          providerId: isUsed ? 'pv1' : null,
          providerName: isUsed ? 'La Bonne Fourchette' : null,
          qrData: JSON.stringify({ number, agentId: agent.id, agentName: agent.name, month: m, value: faceValue }),
        });
      }
    }
  }
  return tickets;
}

async function seed() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (existing.rows[0].count > 0) {
      console.log('Données déjà présentes, seed ignoré.');
      return;
    }

    await client.query('BEGIN');
    await client.query(`UPDATE settings SET org_name = 'Mairie de Paris', org_logo = '', notification_email = 'compta@mairie.fr' WHERE id = 1`);

    for (const a of agents) {
      await client.query(
        `INSERT INTO agents (id, name, department, email, phone, code, active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
        [a.id, a.name, a.department, a.email, a.phone, a.code, now]
      );
    }

    for (const p of providers) {
      await client.query(
        `INSERT INTO providers (id, name, address, siret, email, phone, active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7)`,
        [p.id, p.name, p.address, p.siret, p.email, p.phone, now]
      );
    }

    for (const s of subventions) {
      await client.query(
        `INSERT INTO subventions (id, label, face_value, subsidy, tickets_per_month, applies_to, active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [s.id, s.label, s.faceValue, s.subsidy, s.ticketsPerMonth, JSON.stringify(s.appliesTo), s.active, now]
      );
    }

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO users (id, username, password_hash, role, profile_id, name)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [u.id, u.username, hash, u.role, u.profileId, u.name]
      );
    }

    const tickets = makeTickets([
      { m: '2026-04', usedRatio: 1 },
      { m: '2026-05', usedRatio: 0.85 },
      { m: '2026-06', usedRatio: 0.27 },
    ]);

    for (const t of tickets) {
      await client.query(
        `INSERT INTO tickets (id, number, agent_id, agent_name, month, face_value, subsidy, agent_contribution,
          status, generated_at, used_at, provider_id, provider_name, qr_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [t.id, t.number, t.agentId, t.agentName, t.month, t.faceValue, t.subsidy, t.agentContribution,
          t.status, t.generatedAt, t.usedAt, t.providerId, t.providerName, t.qrData]
      );
    }

    await client.query('COMMIT');
    console.log(`Seed terminé : ${agents.length} agents, ${tickets.length} tickets.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
