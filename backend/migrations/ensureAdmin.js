/**
 * Crée le compte administrateur si absent (1er déploiement Render / prod).
 * Variables optionnelles : ADMIN_USERNAME, ADMIN_PASSWORD
 */
import bcrypt from 'bcryptjs';
import pool from '../src/config/database.js';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function main() {
  const existing = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (existing.rows.length) {
    console.log('→ Compte admin déjà présent');
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, role, profile_id, name, email, must_change_password)
     VALUES ('u-admin', $1, $2, 'admin', 'admin', 'Administration', $3, false)`,
    [ADMIN_USERNAME, hash, process.env.ADMIN_EMAIL || 'admin@atlantide.local'],
  );

  console.log(`→ Compte admin créé : ${ADMIN_USERNAME}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
