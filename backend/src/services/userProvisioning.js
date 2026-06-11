import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/database.js';
import { sendMail } from './email.js';
import { setupPasswordEmail, providerWelcomeEmail } from './emailTemplates.js';
import { newId } from '../utils/tickets.js';

const SETUP_TTL_HOURS = Number(process.env.SETUP_TOKEN_TTL_HOURS || 72);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const DEFAULT_PROVIDER_PASSWORD = process.env.DEFAULT_PROVIDER_PASSWORD || 'Prest@2026';

function slugify(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function uniqueUsername(client, email, code) {
  const base = email.toLowerCase();
  const taken = await client.query('SELECT id FROM users WHERE username = $1 OR email = $1', [base]);
  if (!taken.rows.length) return base;
  return `${base.split('@')[0]}.${(code || 'agent').toLowerCase()}@dirm.fr`;
}

export async function provisionAgentUser(client, agent, { sendEmail = true } = {}) {
  const existing = await client.query(
    'SELECT id FROM users WHERE role = $1 AND profile_id = $2',
    ['agent', agent.id],
  );
  if (existing.rows.length) return { skipped: true, userId: existing.rows[0].id };

  const email = (agent.email || '').trim().toLowerCase();
  if (!email) throw new Error(`Agent ${agent.name} sans email`);

  const username = await uniqueUsername(client, email, agent.code || 'agent');
  const setupToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SETUP_TTL_HOURS * 3600 * 1000);
  const randomSecret = crypto.randomBytes(24).toString('hex');
  const passwordHash = await bcrypt.hash(randomSecret, 10);
  const userId = newId();
  const setupUrl = `${FRONTEND_URL}/set-password?token=${setupToken}`;

  await client.query(
    `INSERT INTO users (id, username, email, password_hash, role, profile_id, name, must_change_password, setup_token, setup_token_expires)
     VALUES ($1,$2,$3,$4,'agent',$5,$6,true,$7,$8)`,
    [userId, username, email, passwordHash, agent.id, agent.name, setupToken, expires],
  );

  if (sendEmail) {
    const mail = setupPasswordEmail({ name: agent.name, username, setupUrl, ttlHours: SETUP_TTL_HOURS });
    await sendMail({ to: email, ...mail });
  }

  return { skipped: false, userId, username, email, setupUrl };
}

/** Met à jour l'email du compte agent et renvoie un lien d'activation si demandé. */
export async function syncAgentUserEmail(client, agent, { sendEmail = false, forceResend = false } = {}) {
  const email = (agent.email || '').trim().toLowerCase();
  if (!email) return { updated: false, reason: 'no_email' };

  const existing = await client.query(
    'SELECT * FROM users WHERE role = $1 AND profile_id = $2',
    ['agent', agent.id],
  );
  if (!existing.rows.length) {
    return provisionAgentUser(client, agent, { sendEmail });
  }

  const user = existing.rows[0];
  const emailChanged = user.email?.toLowerCase() !== email;
  const username = await uniqueUsername(client, email, agent.code || 'agent');
  const setupToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SETUP_TTL_HOURS * 3600 * 1000);
  const setupUrl = `${FRONTEND_URL}/set-password?token=${setupToken}`;

  await client.query(
    `UPDATE users SET email = $1, username = $2, setup_token = $3, setup_token_expires = $4, must_change_password = true
     WHERE id = $5`,
    [email, username, setupToken, expires, user.id],
  );

  const shouldEmail = sendEmail && (emailChanged || forceResend);
  if (shouldEmail) {
    const mail = setupPasswordEmail({ name: agent.name, username, setupUrl, ttlHours: SETUP_TTL_HOURS });
    await sendMail({ to: email, ...mail });
  }

  return { updated: true, emailChanged, email, setupUrl, emailed: shouldEmail };
}

export async function provisionProviderUser(client, provider, { sendEmail = true, password = DEFAULT_PROVIDER_PASSWORD } = {}) {
  const existing = await client.query(
    'SELECT id FROM users WHERE role = $1 AND profile_id = $2',
    ['provider', provider.id],
  );
  if (existing.rows.length) return { skipped: true, userId: existing.rows[0].id };

  const email = (provider.email || '').trim().toLowerCase();
  const username = email || slugify(provider.name).slice(0, 30);
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = newId();

  await client.query(
    `INSERT INTO users (id, username, email, password_hash, role, profile_id, name, must_change_password)
     VALUES ($1,$2,$3,$4,'provider',$5,$6,false)`,
    [userId, username, email || username, passwordHash, provider.id, provider.name],
  );

  if (sendEmail && email) {
    const mail = providerWelcomeEmail({
      name: provider.name,
      username,
      password,
      loginUrl: FRONTEND_URL,
    });
    await sendMail({ to: email, ...mail });
  }

  return { skipped: false, userId, username, password, email: email || username };
}

export async function provisionAllAgents({ sendEmail = true } = {}) {
  const client = await pool.connect();
  const results = { created: 0, skipped: 0, errors: [] };
  try {
    const agents = await client.query('SELECT * FROM agents WHERE active = true ORDER BY name');
    for (const agent of agents.rows) {
      try {
        const r = await provisionAgentUser(client, agent, { sendEmail });
        if (r.skipped) results.skipped += 1;
        else results.created += 1;
      } catch (err) {
        results.errors.push({ agent: agent.name, error: err.message });
      }
    }
    return results;
  } finally {
    client.release();
  }
}

export async function provisionAllProviders({ sendEmail = false } = {}) {
  const client = await pool.connect();
  const results = { created: 0, skipped: 0, accounts: [], errors: [] };
  try {
    const providers = await client.query('SELECT * FROM providers WHERE active = true ORDER BY name');
    for (const provider of providers.rows) {
      try {
        const r = await provisionProviderUser(client, provider, { sendEmail });
        if (r.skipped) {
          results.skipped += 1;
          const u = await client.query('SELECT username FROM users WHERE role=$1 AND profile_id=$2', ['provider', provider.id]);
          results.accounts.push({ name: provider.name, username: u.rows[0]?.username, password: '(existant)' });
        } else {
          results.created += 1;
          results.accounts.push({ name: provider.name, username: r.username, password: r.password });
        }
      } catch (err) {
        results.errors.push({ provider: provider.name, error: err.message });
      }
    }
    return results;
  } finally {
    client.release();
  }
}
