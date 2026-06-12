import nodemailer from 'nodemailer';
import pool from '../config/database.js';
import { APP_NAME } from '../config/branding.js';
import { getEmailLogoAttachment } from './emailBranding.js';

const enabled = process.env.MAIL_ENABLED !== 'false';

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

export async function verifySmtp() {
  if (!enabled) return { ok: false, error: 'MAIL_ENABLED est désactivé' };
  if (!process.env.SMTP_USER?.trim()) return { ok: false, error: 'SMTP_USER manquant' };
  if (!process.env.SMTP_PASS?.trim()) return { ok: false, error: 'SMTP_PASS manquant' };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    console.error('Erreur vérification SMTP:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  if (!enabled) return { sent: false, skipped: true, reason: 'disabled' };
  if (!to) return { sent: false, skipped: true, reason: 'no_recipient' };
  try {
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
    return { sent: true, to };
  } catch (err) {
    console.error('Erreur envoi email:', err.message);
    return { sent: false, error: err.message };
  }
}
