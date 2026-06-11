import pool from '../config/database.js';
import { sendMail } from './email.js';
import {
  ticketsGeneratedEmail,
  ticketValidatedEmail,
  adminNotificationEmail,
} from './emailTemplates.js';

async function getSettings() {
  const res = await pool.query('SELECT org_name, notification_email FROM settings WHERE id = 1');
  return res.rows[0] || { org_name: 'Tickets Repas', notification_email: process.env.ADMIN_NOTIFICATION_EMAIL || '' };
}

export async function notifyTicketsGenerated(agent, month, count) {
  if (!agent.email) return;
  const settings = await getSettings();
  const monthLabel = new Date(`${month}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const mail = ticketsGeneratedEmail({
    name: agent.name,
    orgName: settings.org_name,
    count,
    monthLabel,
  });
  await sendMail({ to: agent.email, ...mail });

  if (settings.notification_email) {
    const adminMail = adminNotificationEmail({
      title: `Tickets générés — ${agent.name}`,
      orgName: settings.org_name,
      bodyLines: [
        `<strong>${count}</strong> tickets ont été générés pour <strong>${agent.name}</strong> (${agent.department}).`,
        `Période : <strong>${monthLabel}</strong>.`,
      ],
    });
    await sendMail({ to: settings.notification_email, ...adminMail });
  }
}

export async function notifyTicketValidated(ticket, providerName) {
  const settings = await getSettings();
  const agent = await pool.query('SELECT email, name FROM agents WHERE id = $1', [ticket.agentId]);
  const agentEmail = agent.rows[0]?.email;
  const agentName = agent.rows[0]?.name || ticket.agentName;

  if (agentEmail) {
    const mail = ticketValidatedEmail({
      name: agentName,
      orgName: settings.org_name,
      ticketNumber: ticket.number,
      providerName,
      faceValue: `${Number(ticket.faceValue).toFixed(2)} €`,
    });
    await sendMail({ to: agentEmail, ...mail });
  }

  if (settings.notification_email) {
    const adminMail = adminNotificationEmail({
      title: `Validation ticket — ${ticket.number}`,
      orgName: settings.org_name,
      bodyLines: [
        `Ticket <strong>${ticket.number}</strong> de <strong>${agentName}</strong> validé par <strong>${providerName}</strong>.`,
        `Subvention employeur : <strong>${Number(ticket.subsidy).toFixed(2)} €</strong>`,
      ],
    });
    await sendMail({ to: settings.notification_email, ...adminMail });
  }
}

export async function notifyInvoiceSubmitted(invoice) {
  const settings = await getSettings();
  if (!settings.notification_email) return;

  const monthLabel = new Date(`${invoice.month}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const mail = adminNotificationEmail({
    title: `Nouvelle facture — ${invoice.providerName}`,
    orgName: settings.org_name,
    bodyLines: [
      `Facture <strong>${invoice.invoiceNumber}</strong> soumise par <strong>${invoice.providerName}</strong>.`,
      `Période : <strong>${monthLabel}</strong> · Montant : <strong>${Number(invoice.totalAmount).toFixed(2)} €</strong>`,
      `Tickets : <strong>${invoice.ticketCount}</strong>`,
    ],
  });
  await sendMail({ to: settings.notification_email, ...mail });
}

export async function notifyInvoiceReviewed(invoice, status) {
  const provider = await pool.query('SELECT email, name FROM providers WHERE id = $1', [invoice.providerId]);
  const email = provider.rows[0]?.email;
  if (!email) return;

  const settings = await getSettings();
  const approved = status === 'approved';
  const mail = adminNotificationEmail({
    title: `Facture ${approved ? 'approuvée' : 'rejetée'} — ${invoice.invoiceNumber}`,
    orgName: settings.org_name,
    bodyLines: [
      `Bonjour <strong>${invoice.providerName}</strong>,`,
      `Votre facture <strong>${invoice.invoiceNumber}</strong> a été <strong>${approved ? 'approuvée' : 'rejetée'}</strong>.`,
      invoice.reviewNote ? `Commentaire : ${invoice.reviewNote}` : '',
    ].filter(Boolean),
  });
  await sendMail({ to: email, subject: `[${settings.org_name}] Facture ${approved ? 'approuvée' : 'rejetée'}`, ...mail });
}
