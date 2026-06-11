import request from 'supertest';
import app from '../src/app.js';

async function loginAs(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  return res.body.token;
}

describe('Tickets API', () => {
  let providerToken;

  beforeAll(async () => {
    providerToken = await loginAs('lafourchette', 'prest123');
  });

  it('rejette un ticket inconnu', async () => {
    const res = await request(app)
      .post('/api/tickets/validate')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ ticketNumber: 'TRM-999999-XXXXXXXX' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('retourne l état applicatif pour un agent', async () => {
    const token = await loginAs('m.dubois', 'marie2026');
    const res = await request(app)
      .get('/api/app-state')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.tickets.length).toBeGreaterThan(0);
    expect(res.body.tickets.every(t => t.agentId === 'ag1')).toBe(true);
  });
});
