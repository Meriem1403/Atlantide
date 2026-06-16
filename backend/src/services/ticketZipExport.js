import { ZipArchive } from 'archiver';
import pool from '../config/database.js';
import { mapTicket } from '../utils/mappers.js';
import { buildTicketsPdfBuffer, prepareExportAssets } from './ticketPdf.js';

const PDF_CONCURRENCY = 10;

export function sanitizePathSegment(name) {
  return (name || 'Sans service')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Sans service';
}

function uniqueFolderName(base, used) {
  const count = (used.get(base) ?? 0) + 1;
  used.set(base, count);
  return count > 1 ? `${base} (${count})` : base;
}

function buildArchivePaths(batches) {
  const serviceFolderNames = new Map();
  const serviceFolderByName = new Map();
  const agentNamesPerService = new Map();
  const paths = [];

  for (const batch of batches) {
    let serviceFolder = serviceFolderByName.get(batch.serviceName);
    if (!serviceFolder) {
      serviceFolder = uniqueFolderName(sanitizePathSegment(batch.serviceName), serviceFolderNames);
      serviceFolderByName.set(batch.serviceName, serviceFolder);
    }

    const agentBase = sanitizePathSegment(batch.agentName);
    if (!agentNamesPerService.has(serviceFolder)) {
      agentNamesPerService.set(serviceFolder, new Map());
    }
    const usedAgents = agentNamesPerService.get(serviceFolder);
    const agentCount = (usedAgents.get(agentBase) ?? 0) + 1;
    usedAgents.set(agentBase, agentCount);
    const agentFolder = agentCount > 1 ? `${agentBase} (${agentCount})` : agentBase;

    paths.push(`${serviceFolder}/${agentFolder}/tickets.pdf`);
  }

  return paths;
}

async function fetchTicketBatches(month, statusFilter, services) {
  if (!services?.length) return [];

  const params = [month, services];
  let statusClause = '';
  if (statusFilter && statusFilter !== 'all') {
    statusClause = 'AND t.status = $3';
    params.push(statusFilter);
  }

  const result = await pool.query(
    `SELECT t.*,
       CASE
         WHEN p.agent_id IS NOT NULL THEN COALESCE(NULLIF(p.service_name, ''), a.department)
         ELSE a.department
       END AS service_name
     FROM tickets t
     JOIN agents a ON a.id = t.agent_id
     LEFT JOIN agent_monthly_plans p ON p.agent_id = t.agent_id AND p.month = t.month
     WHERE t.month = $1
       AND (
         CASE
           WHEN p.agent_id IS NOT NULL THEN COALESCE(NULLIF(p.service_name, ''), a.department)
           ELSE a.department
         END
       ) = ANY($2::text[])
       ${statusClause}
     ORDER BY service_name, t.agent_name, t.number`,
    params,
  );

  const byKey = new Map();
  for (const row of result.rows) {
    const ticket = mapTicket(row);
    const serviceName = row.service_name ?? 'Sans service';
    const key = `${serviceName}\0${ticket.agentId}`;
    if (!byKey.has(key)) {
      byKey.set(key, { serviceName, agentName: ticket.agentName, tickets: [] });
    }
    byKey.get(key).tickets.push(ticket);
  }

  return [...byKey.values()].sort(
    (a, b) => a.serviceName.localeCompare(b.serviceName, 'fr')
      || a.agentName.localeCompare(b.agentName, 'fr'),
  );
}

async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()),
  );
  return results;
}

export async function streamTicketsZip(res, { month, statusFilter, services, orgName, orgLogo }) {
  const batches = await fetchTicketBatches(month, statusFilter, services);
  if (batches.length === 0) {
    const err = new Error('Aucun ticket pour cette sélection');
    err.status = 404;
    throw err;
  }

  const allTickets = batches.flatMap((batch) => batch.tickets);
  const ticketCount = allTickets.length;
  const fileName = `tickets-${month}-par-service.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('X-Export-Ticket-Count', String(ticketCount));
  res.setHeader('X-Export-Agent-Count', String(batches.length));
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const assets = await prepareExportAssets(allTickets, orgLogo);

  const archive = new ZipArchive({ zlib: { level: 1 } });
  archive.on('error', (err) => {
    throw err;
  });
  archive.pipe(res);

  const paths = buildArchivePaths(batches);
  const concurrency = Math.min(PDF_CONCURRENCY, batches.length);

  await mapWithConcurrency(batches, concurrency, async (batch, index) => {
    const buffer = buildTicketsPdfBuffer(batch.tickets, orgName, orgLogo, assets);
    archive.append(buffer, { name: paths[index] });
    return null;
  });

  await archive.finalize();
}
