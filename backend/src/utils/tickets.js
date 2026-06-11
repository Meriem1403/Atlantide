import crypto from 'crypto';

export function newId() {
  return crypto.randomBytes(8).toString('hex');
}

/** Numéro de ticket cryptographiquement imprévisible (96 bits d'entropie). */
export function generateSecureTicketNumber() {
  const bytes = crypto.randomBytes(12);
  const token = bytes.toString('base64url').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const suffix = (token + crypto.randomBytes(4).toString('hex').toUpperCase()).slice(0, 16);
  return `TR-${suffix}`;
}
