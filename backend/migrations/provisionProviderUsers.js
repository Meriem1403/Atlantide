import pool from '../src/config/database.js';
import { provisionAllProviders } from '../src/services/userProvisioning.js';

async function main() {
  const sendEmail = process.env.SEND_SETUP_EMAIL !== 'false';
  console.log(`Provisioning comptes prestataires (emails: ${sendEmail ? 'oui' : 'non'})…\n`);
  const results = await provisionAllProviders({ sendEmail });
  console.log(`Créés: ${results.created}, déjà existants: ${results.skipped}\n`);
  console.log('── Identifiants prestataires ──');
  for (const acc of results.accounts) {
    console.log(`${acc.name}\n  identifiant : ${acc.username}\n  mot de passe : ${acc.password}\n`);
  }
  if (results.errors.length) console.warn('Erreurs:', results.errors);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
