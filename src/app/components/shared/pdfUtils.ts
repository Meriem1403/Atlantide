import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import * as QRCode from 'qrcode';
import { Ticket } from '../../types';

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

async function buildTicketPage(
  pdf: jsPDF,
  ticket: Ticket,
  orgName: string,
  orgLogo: string,
  pageIndex: number,
) {
  if (pageIndex > 0) pdf.addPage([85, 60], 'landscape');

  const W = 85;

  pdf.setFillColor(67, 97, 238);
  pdf.rect(0, 0, W, 16, 'F');

  let textX = 6;
  if (orgLogo) {
    try {
      const ext = orgLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      const { w, h } = await loadImageSize(orgLogo);
      const fit = fitInBox(w, h, 22, 13);
      const offsetY = 1.5 + (13 - fit.h) / 2;
      const offsetX = 4 + (22 - fit.w) / 2;
      pdf.addImage(orgLogo, ext, offsetX, offsetY, fit.w, fit.h);
      textX = 28;
    } catch { /* skip bad logo */ }
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

  const qrDataUrl: string = await QRCode.toDataURL(ticket.qrData, { width: 200, margin: 1 });
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
  pdf.setFontSize(18);
  pdf.setTextColor(67, 97, 238);
  pdf.text(`${ticket.faceValue.toFixed(2)} EUR`, 5, monthY + 10);

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

export async function downloadTicketPDF(ticket: Ticket, orgName: string, orgLogo = '') {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [60, 85] });
  await buildTicketPage(pdf, ticket, orgName, orgLogo, 0);
  pdf.save(`${ticket.number}.pdf`);
}

export async function downloadBatchTicketsPDF(
  tickets: Ticket[],
  orgName: string,
  orgLogo = '',
  fileName = 'tickets.pdf',
) {
  if (tickets.length === 0) return;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [60, 85] });
  for (let i = 0; i < tickets.length; i++) {
    await buildTicketPage(pdf, tickets[i], orgName, orgLogo, i);
  }
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

export async function buildTicketsPdfBlob(
  tickets: Ticket[],
  orgName: string,
  orgLogo = '',
): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [60, 85] });
  for (let i = 0; i < tickets.length; i++) {
    await buildTicketPage(pdf, tickets[i], orgName, orgLogo, i);
  }
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
  onProgress?: (done: number, total: number, serviceName: string) => void,
) {
  const zip = new JSZip();
  const folderNames = new Map<string, number>();

  const nonEmpty = groups.filter(g => g.tickets.length > 0);
  for (let i = 0; i < nonEmpty.length; i++) {
    const group = nonEmpty[i];
    onProgress?.(i, nonEmpty.length, group.serviceName);

    const base = sanitizePathSegment(group.serviceName);
    const count = (folderNames.get(base) ?? 0) + 1;
    folderNames.set(base, count);
    const folderName = count > 1 ? `${base} (${count})` : base;

    const folder = zip.folder(folderName);
    if (!folder) continue;

    const batchBlob = await buildTicketsPdfBlob(group.tickets, orgName, orgLogo);
    folder.file('tickets.pdf', batchBlob);

    for (const ticket of group.tickets) {
      const ticketBlob = await buildTicketsPdfBlob([ticket], orgName, orgLogo);
      const agentSlug = sanitizePathSegment(ticket.agentName);
      folder.file(`${agentSlug} - ${ticket.number}.pdf`, ticketBlob);
    }
  }

  onProgress?.(nonEmpty.length, nonEmpty.length, '');
  const content = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(content, zipFileName);
}
