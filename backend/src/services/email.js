import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import pool from '../config/database.js';
import { APP_NAME } from '../config/branding.js';
import { getEmailLogoAttachment } from './emailBranding.js';

const enabled = process.env.MAIL_ENABLED !== 'false';

function useResend() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

async function resolveMailFrom() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  try {
    const res = await pool.query('SELECT mail_from FROM settings WHERE id = 1');
    const addr = res.rows[0]?.mail_from?.trim();
    if (addr) return `${APP_NAME} <${addr}>`;
  } catch {
    // ignore
  }
  return `${APP_NAME} <noreply@ticketsrepas.local>`;
}

/** Adresse expéditrice Resend (domaine vérifié ou onboarding@resend.dev). */
async function resolveResendFrom() {
  if (process.env.RESEND_FROM?.trim()) return process.env.RESEND_FROM.trim();

  const mailFrom = await resolveMailFrom();
  const addrMatch = mailFrom.match(/<([^>]+)>/);
  const addr = addrMatch?.[1]?.toLowerCase() || mailFrom.toLowerCase();

  // Gmail / adresses non vérifiées chez Resend → adresse de test Resend
  if (addr.endsWith('@gmail.com') || addr.endsWith('@googlemail.com') || addr.includes('@ticketsrepas.local')) {
    const nameMatch = mailFrom.match(/^([^<]+)</);
    const name = nameMatch ? nameMatch[1].trim() : APP_NAME;
    return `${name} <onboarding@resend.dev>`;
  }

  return mailFrom;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === 'true',
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER.trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''),
  } : undefined,
});

function toResendAttachment({ filename, content, cid, contentType }) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const item = {
    filename: filename || 'attachment',
    content: buffer,
    contentType,
  };
  if (cid) item.inlineContentId = cid;
  return item;
}

function buildResendAttachments(html, extraAttachments = []) {
  const resendAttachments = [];
  const logo = getEmailLogoAttachment();
  const needsLogo = logo && html?.includes(`cid:${logo.cid}`);

  if (needsLogo) {
    resendAttachments.push(toResendAttachment(logo));
  }

  for (const a of extraAttachments) {
    resendAttachments.push(toResendAttachment(a));
  }

  return resendAttachments.length ? resendAttachments : undefined;
}

async function sendViaResend({ to, subject, text, html, attachments = [] }) {
  const resend = new Resend(process.env.RESEND_API_KEY.trim());
  const from = await resolveResendFrom();
  const htmlBody = html || `<p>${text.replace(/\n/g, '<br>')}</p>`;

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    text,
    html: htmlBody,
    attachments: buildResendAttachments(htmlBody, attachments),
  });

  if (error) throw new Error(error.message || 'Erreur Resend');
  return { sent: true, to, provider: 'resend', id: data?.id, from };
}

async function sendViaSmtp({ to, subject, text, html, attachments = [] }) {
  const logo = getEmailLogoAttachment();
  const allAttachments = [...attachments];
  if (logo && html?.includes(`cid:${logo.cid}`) && !allAttachments.some((a) => a.cid === logo.cid)) {
    allAttachments.push(logo);
  }

  await transporter.sendMail({
    from: await resolveMailFrom(),
    to,
    subject,
    text,
    html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`,
    attachments: allAttachments.length ? allAttachments : undefined,
  });
  return { sent: true, to, provider: 'smtp' };
}

export async function verifyEmail() {
  if (!enabled) return { ok: false, error: 'MAIL_ENABLED est désactivé' };

  if (useResend()) {
    return { ok: true, provider: 'resend' };
  }

  if (!process.env.SMTP_USER?.trim()) return { ok: false, error: 'SMTP_USER manquant (ou définissez RESEND_API_KEY)' };
  if (!process.env.SMTP_PASS?.trim()) return { ok: false, error: 'SMTP_PASS manquant (ou définissez RESEND_API_KEY)' };
  try {
    await transporter.verify();
    return { ok: true, provider: 'smtp' };
  } catch (err) {
    console.error('Erreur vérification SMTP:', err.message);
    return { ok: false, error: err.message };
  }
}

/** @deprecated utilisez verifyEmail */
export const verifySmtp = verifyEmail;

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  if (!enabled) return { sent: false, skipped: true, reason: 'disabled' };
  if (!to) return { sent: false, skipped: true, reason: 'no_recipient' };
  try {
    if (useResend()) {
      return await sendViaResend({ to, subject, text, html, attachments });
    }
    return await sendViaSmtp({ to, subject, text, html, attachments });
  } catch (err) {
    console.error('Erreur envoi email:', err.message);
    return { sent: false, error: err.message };
  }
}
