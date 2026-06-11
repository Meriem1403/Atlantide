import pool from '../src/config/database.js';
import { provisionAllAgents } from '../src/services/userProvisioning.js';

async function main() {
  const sendEmail = process.env.SEND_SETUP_EMAIL !== 'false';
  console.log(`Provisioning des comptes agents (emails: ${sendEmail ? 'oui' : 'non'})…`);
  const results = await provisionAllAgents({ sendEmail });
  console.log(`Créés: ${results.created}, déjà existants: ${results.skipped}`);
  if (results.errors.length) {
    console.warn('Erreurs:', results.errors);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
