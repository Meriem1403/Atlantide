import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import * as QRCode from 'qrcode';
import { Ticket } from '../../types';

type LogoFit = { w: number; h: number; ext: string } | null;

function loadImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function fitInBox(nw: number, nh: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / nw, maxH / nh, 1);
  return { w: nw * ratio, h: nh * ratio };
}

async function resolveLogoFit(orgLogo: string): Promise<LogoFit> {
  if (!orgLogo) return null;
  try {
    const ext = orgLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    const { w, h } = await loadImageSize(orgLogo);
    const fit = fitInBox(w, h, 22, 13);
    return { w: fit.w, h: fit.h, ext };
  } catch {
    return null;
  }
}

async function prefetchQrCodes(tickets: Ticket[]): Promise<string[]> {
  return Promise.all(
    tickets.map(ticket => QRCode.toDataURL(ticket.qrData, { width: 200, margin: 1 })),
  );
}

function buildTicketPage(
  pdf: jsPDF,
  ticket: Ticket,
  orgName: string,
  orgLogo: string,
  logoFit: LogoFit,
  qrDataUrl: string,
  pageIndex: number,
) {
  if (pageIndex > 0) pdf.addPage([85, 60], 'landscape');

  const W = 85;

  pdf.setFillColor(67, 97, 238);
  pdf.rect(0, 0, W, 16, 'F');

  let textX = 6;
  if (logoFit && orgLogo) {
    const offsetY = 1.5 + (13 - logoFit.h) / 2;
    const offsetX = 4 + (22 - logoFit.w) / 2;
    pdf.addImage(orgLogo, logoFit.ext, offsetX, offsetY, logoFit.w, logoFit.h);
    textX = 28;
  }

  const qrLeft = W - 28;
  const textMaxW = qrLeft - 5;

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  const orgLines = pdf.splitTextToSize(orgName, textMaxW - (textX - 5));
  pdf.text(orgLines, textX, 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.5);
  const ticketTypeY = 7 + orgLines.length * 3.2;
  pdf.text('Ticket repas', textX, ticketTypeY);

  pdf.addImage(qrDataUrl, 'PNG', qrLeft, 18, 24, 24);

  pdf.setFillColor(245, 245, 247);
  pdf.roundedRect(5, 18, 50, 7, 2, 2, 'F');
  pdf.setTextColor(110, 110, 115);
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(6.5);
  pdf.text(ticket.number, 7, 23);

  pdf.setTextColor(29, 29, 31);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  const nameLines = pdf.splitTextToSize(ticket.agentName, textMaxW);
  pdf.text(nameLines, 5, 33);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(110, 110, 115);
  const monthLabel = new Date(ticket.month + '-15').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const monthY = 33 + nameLines.length * 4 + 1;
  pdf.text(`Valable : ${monthLabel}`, 5, monthY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(67, 97, 238);
  pdf.text(`${ticket.faceValue.toFixed(2)} EUR`, 5, monthY + 9);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(110, 110, 115);
  const contribution = Math.max(0, ticket.faceValue - ticket.subsidy);
  pdf.text(`Subvention employeur : ${ticket.subsidy.toFixed(2)} EUR`, 5, monthY + 13);
  pdf.text(`Reste agent : ${contribution.toFixed(2)} EUR`, 5, monthY + 16.5);

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineDashPattern([1, 1], 0);
  pdf.line(0, 57, W, 57);
  pdf.setLineDashPattern([], 0);

  if (ticket.status === 'used') {
    pdf.setTextColor(220, 50, 40);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('UTILISE', 18, 45, { angle: 30 });
  }
}

async function buildTicketsPdf(
  tickets: Ticket[],
  orgName: string,
  orgLogo = '',
): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [60, 85] });
  if (tickets.length === 0) return pdf;

  const [logoFit, qrCodes] = await Promise.all([
    resolveLogoFit(orgLogo),
    prefetchQrCodes(tickets),
  ]);

  for (let i = 0; i < tickets.length; i++) {
    buildTicketPage(pdf, tickets[i], orgName, orgLogo, logoFit, qrCodes[i], i);
  }
  return pdf;
}

export async function downloadTicketPDF(ticket: Ticket, orgName: string, orgLogo = '') {
  const pdf = await buildTicketsPdf([ticket], orgName, orgLogo);
  pdf.save(`${ticket.number}.pdf`);
}

export async function downloadBatchTicketsPDF(
  tickets: Ticket[],
  orgName: string,
  orgLogo = '',
  fileName = 'tickets.pdf',
) {
  if (tickets.length === 0) return;
  const pdf = await buildTicketsPdf(tickets, orgName, orgLogo);
  pdf.save(fileName);
}

export function sanitizePathSegment(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Sans service';
}

export interface ServiceTicketGroup {
  serviceName: string;
  tickets: Ticket[];
}

interface AgentTicketBatch {
  serviceName: string;
  agentName: string;
  tickets: Ticket[];
}

function expandGroupsByAgent(groups: ServiceTicketGroup[]): AgentTicketBatch[] {
  const batches: AgentTicketBatch[] = [];

  for (const group of groups) {
    const byAgent = new Map<string, Ticket[]>();
    for (const ticket of group.tickets) {
      if (!byAgent.has(ticket.agentId)) byAgent.set(ticket.agentId, []);
      byAgent.get(ticket.agentId)!.push(ticket);
    }

    for (const agentTickets of byAgent.values()) {
      batches.push({
        serviceName: group.serviceName,
        agentName: agentTickets[0].agentName,
        tickets: agentTickets.sort(
          (a, b) => a.number.localeCompare(b.number, 'fr'),
        ),
      });
    }
  }

  return batches.sort(
    (a, b) => a.serviceName.localeCompare(b.serviceName, 'fr')
      || a.agentName.localeCompare(b.agentName, 'fr'),
  );
}

function uniqueFolderName(base: string, used: Map<string, number>): string {
  const count = (used.get(base) ?? 0) + 1;
  used.set(base, count);
  return count > 1 ? `${base} (${count})` : base;
}

export async function buildTicketsPdfBlob(
  tickets: Ticket[],
  orgName: string,
  orgLogo = '',
): Promise<Blob> {
  const pdf = await buildTicketsPdf(tickets, orgName, orgLogo);
  return pdf.output('blob');
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadTicketsZipByService(
  groups: ServiceTicketGroup[],
  orgName: string,
  orgLogo = '',
  zipFileName = 'tickets-par-service.zip',
  onProgress?: (done: number, total: number, label: string) => void,
) {
  const zip = new JSZip();
  const serviceFolderNames = new Map<string, number>();
  const batches = expandGroupsByAgent(groups.filter(g => g.tickets.length > 0));
  const total = batches.length;

  const prepared = await Promise.all(
    batches.map(async (batch, index) => {
      onProgress?.(index, total, `${batch.serviceName} — ${batch.agentName}`);
      const blob = await buildTicketsPdfBlob(batch.tickets, orgName, orgLogo);
      return { batch, blob };
    }),
  );

  const agentNamesPerService = new Map<string, Map<string, number>>();
  const serviceFolderByName = new Map<string, string>();

  for (const { batch, blob } of prepared) {
    let serviceFolder = serviceFolderByName.get(batch.serviceName);
    if (!serviceFolder) {
      serviceFolder = uniqueFolderName(sanitizePathSegment(batch.serviceName), serviceFolderNames);
      serviceFolderByName.set(batch.serviceName, serviceFolder);
    }
    const agentBase = sanitizePathSegment(batch.agentName);

    if (!agentNamesPerService.has(serviceFolder)) {
      agentNamesPerService.set(serviceFolder, new Map());
    }
    const usedAgents = agentNamesPerService.get(serviceFolder)!;
    const agentCount = (usedAgents.get(agentBase) ?? 0) + 1;
    usedAgents.set(agentBase, agentCount);
    const agentFolder = agentCount > 1 ? `${agentBase} (${agentCount})` : agentBase;

    zip.folder(serviceFolder)?.folder(agentFolder)?.file('tickets.pdf', blob);
  }

  onProgress?.(total, total, 'Compression…');
  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 3 },
  });
  triggerBlobDownload(content, zipFileName);
}
