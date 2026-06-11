import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** CID référencé dans les templates HTML (`cid:…`). */
export const EMAIL_LOGO_CID = 'org-logo@atlantide';

const LOGO_CANDIDATES = [
  path.resolve(__dirname, '../../assets/org-logo.png'),
  path.resolve(__dirname, '../../../datadoc/org-logo.png'),
  path.resolve(__dirname, '../../../public/org-logo.png'),
  path.resolve(__dirname, '../../../Image 11-06-2026 à 11.50.png'),
];

let cachedAttachment = null;

function loadLogoBuffer() {
  const logoPath = LOGO_CANDIDATES.find((p) => fs.existsSync(p));
  if (!logoPath) return null;
  return fs.readFileSync(logoPath);
}

/** Pièce jointe inline pour nodemailer (affichage fiable dans Gmail, Outlook…). */
export function getEmailLogoAttachment() {
  if (cachedAttachment) return cachedAttachment;

  const buffer = loadLogoBuffer();
  if (!buffer) return null;

  cachedAttachment = {
    filename: 'org-logo.png',
    content: buffer,
    cid: EMAIL_LOGO_CID,
    contentType: 'image/png',
    contentDisposition: 'inline',
  };
  return cachedAttachment;
}

export function emailLogoHeaderHtml() {
  if (!getEmailLogoAttachment()) return '';
  return `
        <tr>
          <td style="padding:28px 32px 20px;background:#ffffff;border-bottom:1px solid #E8EEF8;">
            <img src="cid:${EMAIL_LOGO_CID}" alt="Ministère chargé de la Mer et de la Pêche" width="280" style="display:block;max-width:100%;height:auto;border:0;" />
          </td>
        </tr>`;
}
