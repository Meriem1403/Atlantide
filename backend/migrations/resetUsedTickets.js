/**
 * Remet en statut « actif » tous les tickets marqués utilisés (tests / démo).
 * Usage : npm run reset-used-tickets
 * Docker : docker exec ticketsrepas-backend node migrations/resetUsedTickets.js
 */
import pool from '../src/config/database.js';

async function main() {
  const result = await pool.query(
    `UPDATE tickets
     SET status = 'active', used_at = NULL, provider_id = NULL, provider_name = NULL
     WHERE status = 'used'
     RETURNING number`,
  );
  console.log(`→ ${result.rowCount} ticket(s) remis en statut actif`);
  if (result.rowCount > 0) {
    result.rows.slice(0, 10).forEach((r) => console.log(`  · ${r.number}`));
    if (result.rowCount > 10) console.log(`  … et ${result.rowCount - 10} autre(s)`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
