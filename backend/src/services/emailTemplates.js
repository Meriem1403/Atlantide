import { APP_NAME } from '../config/branding.js';
import { emailLogoHeaderHtml } from './emailBranding.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BRAND = '#003189';
const BRAND_LIGHT = '#E8EEF8';

/** Mise en page sobre (meilleure délivrabilité Gmail, sans image inline). */
function transactionalLayout({ title, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;background:#ffffff;">
  <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${APP_NAME}</p>
  <h1 style="margin:0 0 20px;font-size:20px;color:#003189;">${title}</h1>
  ${bodyHtml}
  ${ctaLabel && ctaUrl ? `
  <p style="margin:24px 0 12px;">
    <a href="${ctaUrl}" style="color:#003189;font-weight:bold;">${ctaLabel}</a>
  </p>
  <p style="margin:0 0 16px;font-size:13px;color:#6b7280;word-break:break-all;">${ctaUrl}</p>` : ''}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="margin:0;font-size:12px;color:#9ca3af;">${footerNote || `Ministère chargé de la Mer et de la Pêche — ${APP_NAME}`}</p>
</body>
</html>`;
}

function layout({ preheader, title, bodyHtml, ctaLabel, ctaUrl, footerNote }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F4F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader || title}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F6FA;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,49,137,0.08);">
        ${emailLogoHeaderHtml()}
        <tr>
          <td style="background:linear-gradient(135deg, ${BRAND} 0%, #1E5BB8 100%);padding:24px 32px 28px;">
            <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.75);font-weight:600;">${APP_NAME}</div>
            <div style="font-size:22px;font-weight:700;color:#ffffff;margin-top:8px;line-height:1.3;">${title}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:#1F2937;font-size:15px;line-height:1.65;">
            ${bodyHtml}
            ${ctaLabel && ctaUrl ? `
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
              <tr><td style="border-radius:10px;background:${BRAND};">
                <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">${ctaLabel}</a>
              </td></tr>
            </table>
            <p style="font-size:12px;color:#6B7280;margin:12px 0 0;word-break:break-all;">${ctaUrl}</p>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;background:${BRAND_LIGHT};border-top:1px solid #D7E2F2;">
            <p style="margin:0;font-size:12px;color:#4B5563;line-height:1.5;">
              ${footerNote || `Ministère chargé de la Mer et de la Pêche — ${APP_NAME}`}
            </p>
            <p style="margin:8px 0 0;font-size:11px;color:#9CA3AF;">Cet email est envoyé automatiquement, merci de ne pas y répondre.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function setupPasswordEmail({ name, username, setupUrl, ttlHours }) {
  const title = 'Activez votre espace agent';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Bonjour ${name},</p>
    <p style="margin:0 0 12px;">Votre compte ${APP_NAME} a été créé. Définissez votre mot de passe pour accéder à vos tickets restaurant.</p>
    <p style="margin:0 0 12px;"><strong>Identifiant :</strong> ${username}</p>
    <p style="margin:0 0 12px;">Lien valable ${ttlHours} heures.</p>`;
  const html = transactionalLayout({
    title,
    bodyHtml,
    ctaLabel: 'Créer mon mot de passe',
    ctaUrl: setupUrl,
  });
  const text = [
    `Bonjour ${name},`,
    '',
    `Votre compte ${APP_NAME} a été créé.`,
    `Identifiant : ${username}`,
    '',
    `Créez votre mot de passe :`,
    setupUrl,
    '',
    `Lien valable ${ttlHours} heures.`,
    '',
    `— ${APP_NAME}`,
  ].join('\n');
  return { subject: `[${APP_NAME}] Activez votre compte agent`, html, text };
}

export function resetPasswordEmail({ name, resetUrl, ttlHours }) {
  const title = 'Réinitialisation du mot de passe';
  const bodyHtml = `
    <p style="margin:0 0 12px;">Bonjour ${name},</p>
    <p style="margin:0 0 12px;">Demande de réinitialisation de mot de passe pour votre compte ${APP_NAME}.</p>
    <p style="margin:0 0 12px;">Lien valable ${ttlHours} heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`;
  const html = transactionalLayout({
    title,
    bodyHtml,
    ctaLabel: 'Réinitialiser mon mot de passe',
    ctaUrl: resetUrl,
  });
  const text = [
    `Bonjour ${name},`,
    '',
    `Réinitialisez votre mot de passe :`,
    resetUrl,
    '',
    `Lien valable ${ttlHours} heures.`,
    '',
    `— ${APP_NAME}`,
  ].join('\n');
  return { subject: `[${APP_NAME}] Réinitialisation du mot de passe`, html, text };
}

export function ticketsGeneratedEmail({ name, orgName, count, monthLabel }) {
  const title = `${count} tickets disponibles`;
  const html = layout({
    preheader: `${count} tickets restaurant pour ${monthLabel}.`,
    title,
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 20px;"><strong>${count} tickets restaurant</strong> ont été générés pour la période de <strong>${monthLabel}</strong>.</p>
      <table role="presentation" width="100%" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;">
        <tr><td style="padding:18px 20px;text-align:center;">
          <div style="font-size:32px;font-weight:800;color:#15803D;">${count}</div>
          <div style="font-size:13px;color:#166534;margin-top:4px;">tickets prêts à l'emploi</div>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#6B7280;font-size:13px;">Connectez-vous à votre espace pour les consulter, les imprimer ou les télécharger en PDF.</p>`,
    ctaLabel: 'Accéder à mon espace',
    ctaUrl: FRONTEND_URL,
    footerNote: orgName,
  });
  const text = `Bonjour ${name},\n\n${count} tickets pour ${monthLabel}.\n\n${FRONTEND_URL}`;
  return { subject: `[${orgName}] ${count} tickets — ${monthLabel}`, html, text };
}

export function ticketValidatedEmail({ name, orgName, ticketNumber, providerName, faceValue }) {
  const html = layout({
    preheader: `Ticket ${ticketNumber} validé chez ${providerName}.`,
    title: 'Ticket utilisé',
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 16px;">Votre ticket <strong style="font-family:monospace;">${ticketNumber}</strong> a été validé chez <strong>${providerName}</strong>.</p>
      <table role="presentation" width="100%" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:11px;color:#6B7280;text-transform:uppercase;">Montant</div>
          <div style="font-size:22px;font-weight:800;color:#003189;margin-top:4px;">${faceValue}</div>
        </td></tr>
      </table>`,
    footerNote: orgName,
  });
  const text = `Bonjour ${name},\n\nTicket ${ticketNumber} validé chez ${providerName}. Montant : ${faceValue}`;
  return { subject: `[${orgName}] Ticket utilisé — ${ticketNumber}`, html, text };
}

export function providerWelcomeEmail({ name, username, password, loginUrl }) {
  const html = layout({
    preheader: `Vos identifiants prestataire ${APP_NAME}.`,
    title: 'Votre espace prestataire',
    bodyHtml: `
      <p style="margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte prestataire sur la plateforme ${APP_NAME} est actif. Utilisez les identifiants ci-dessous pour valider les tickets et soumettre vos factures.</p>
      <table role="presentation" width="100%" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          <div style="font-size:11px;color:#6B7280;text-transform:uppercase;">Identifiant</div>
          <div style="font-size:16px;font-weight:700;color:#111827;margin:6px 0 14px;">${username}</div>
          <div style="font-size:11px;color:#6B7280;text-transform:uppercase;">Mot de passe temporaire</div>
          <div style="font-size:16px;font-weight:700;color:#111827;margin-top:6px;font-family:monospace;">${password}</div>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#6B7280;font-size:13px;">Nous vous recommandons de modifier ce mot de passe après votre première connexion.</p>`,
    ctaLabel: 'Se connecter',
    ctaUrl: loginUrl,
  });
  const text = `Bonjour ${name},\n\nIdentifiant : ${username}\nMot de passe : ${password}\n\n${loginUrl}`;
  return { subject: `${APP_NAME} — Accès prestataire`, html, text };
}

export function adminNotificationEmail({ title, bodyLines, orgName }) {
  const html = layout({
    preheader: title,
    title,
    bodyHtml: bodyLines.map((line) => `<p style="margin:0 0 12px;">${line}</p>`).join(''),
    footerNote: orgName,
  });
  const text = `${title}\n\n${bodyLines.join('\n')}`;
  return { subject: `[Admin] ${title}`, html, text };
}
