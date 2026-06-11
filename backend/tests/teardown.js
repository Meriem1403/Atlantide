import pool from '../src/config/database.js';

export default async function globalTeardown() {
  await pool.end();
}
