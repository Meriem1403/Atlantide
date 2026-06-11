import nodemailer from 'nodemailer';
import { APP_NAME } from '../config/branding.js';
import { getEmailLogoAttachment } from './emailBranding.js';

const enabled = process.env.MAIL_ENABLED !== 'false';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailpit',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendMail({ to, subject, text, html, attachments = [] }) {
  if (!enabled || !to) return;
  try {
    const logo = getEmailLogoAttachment();
    const allAttachments = [...attachments];
    if (logo && html?.includes(`cid:${logo.cid}`) && !allAttachments.some((a) => a.cid === logo.cid)) {
      allAttachments.push(logo);
    }

    await transporter.sendMail({
      from: process.env.MAIL_FROM || `${APP_NAME} <noreply@ticketsrepas.local>`,
      to,
      subject,
      text,
      html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`,
      attachments: allAttachments.length ? allAttachments : undefined,
    });
  } catch (err) {
    console.error('Erreur envoi email:', err.message);
  }
}
