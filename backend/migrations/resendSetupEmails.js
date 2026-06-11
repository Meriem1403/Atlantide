import pool from '../src/config/database.js';
import { sendMail } from '../src/services/email.js';
import { setupPasswordEmail } from '../src/services/emailTemplates.js';

const SETUP_TTL_HOURS = Number(process.env.SETUP_TOKEN_TTL_HOURS || 72);

async function main() {
  const client = await pool.connect();
  try {
    const users = await client.query(
      `SELECT u.*, a.name AS agent_name FROM users u
       JOIN agents a ON a.id = u.profile_id
       WHERE u.role = 'agent' AND u.setup_token IS NOT NULL AND u.setup_token_expires > NOW()`,
    );
    let sent = 0;
    for (const user of users.rows) {
      const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password?token=${user.setup_token}`;
      const to = user.email || user.username;
      const mail = setupPasswordEmail({
        name: user.agent_name,
        username: user.username,
        setupUrl,
        ttlHours: SETUP_TTL_HOURS,
      });
      await sendMail({ to, ...mail });
      sent += 1;
      console.log(`→ ${user.agent_name} (${to})`);
    }
    console.log(`\n${sent} email(s) envoyé(s). Consultez Mailpit : http://localhost:8025`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
