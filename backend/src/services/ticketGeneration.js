import { mapTicket } from '../utils/mappers.js';
import { newId, generateSecureTicketNumber } from '../utils/tickets.js';

export async function generateForAgent(client, { agentId, month, count, faceValue, subsidy }) {
  const agent = await client.query('SELECT * FROM agents WHERE id = $1', [agentId]);
  if (!agent.rows.length) {
    const err = new Error('Agent introuvable');
    err.status = 404;
    err.agentId = agentId;
    throw err;
  }
  if (!Number.isFinite(count) || count < 1) {
    const err = new Error('Nombre de tickets invalide');
    err.status = 400;
    err.agentId = agentId;
    throw err;
  }

  await client.query('DELETE FROM tickets WHERE agent_id = $1 AND month = $2', [agentId, month]);

  const agentName = agent.rows[0].name;
  const contribution = 0;
  const created = [];

  for (let i = 0; i < count; i++) {
    const number = generateSecureTicketNumber();
    const id = newId();
    const qrData = JSON.stringify({ number, agentId, agentName, month, value: faceValue });
    const result = await client.query(
      `INSERT INTO tickets (id, number, agent_id, agent_name, month, face_value, subsidy,
        agent_contribution, status, qr_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9) RETURNING *`,
      [id, number, agentId, agentName, month, faceValue, subsidy, contribution, qrData]
    );
    created.push(mapTicket(result.rows[0]));
  }

  return { agent: agent.rows[0], created };
}
