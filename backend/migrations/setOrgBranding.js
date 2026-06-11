import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/database.js';

const ORG_NAME = process.env.ORG_NAME || 'Ministère chargé de la Mer et de la Pêche';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  path.resolve(__dirname, '../assets/org-logo.png'),
  '/datadoc/org-logo.png',
  path.resolve(__dirname, '../../datadoc/org-logo.png'),
  path.resolve(__dirname, '../../public/org-logo.png'),
  path.resolve(__dirname, '../../Image 11-06-2026 à 11.50.png'),
];

async function main() {
  const logoPath = candidates.find((p) => fs.existsSync(p));
  if (!logoPath) throw new Error(`Logo introuvable. Placez org-logo.png dans datadoc/`);

  const buffer = fs.readFileSync(logoPath);
  const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

  await pool.query(
    `UPDATE settings SET org_name = $1, org_logo = $2 WHERE id = 1`,
    [ORG_NAME, base64],
  );

  console.log(`Branding mis à jour : ${ORG_NAME}`);
  console.log(`Logo : ${logoPath} (${Math.round(buffer.length / 1024)} Ko)`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
