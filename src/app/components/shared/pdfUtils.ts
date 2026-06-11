import { jsPDF } from 'jspdf';
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

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(orgName, textX, 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.5);
  pdf.text('Ticket restaurant', textX, 11);

  const qrDataUrl: string = await QRCode.toDataURL(ticket.qrData, { width: 200, margin: 1 });
  pdf.addImage(qrDataUrl, 'PNG', W - 28, 18, 24, 24);

  pdf.setFillColor(245, 245, 247);
  pdf.roundedRect(5, 18, 50, 7, 2, 2, 'F');
  pdf.setTextColor(110, 110, 115);
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(6.5);
  pdf.text(ticket.number, 7, 23);

  pdf.setTextColor(29, 29, 31);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text(ticket.agentName, 5, 33);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(110, 110, 115);
  const monthLabel = new Date(ticket.month + '-15').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  pdf.text(`Valable : ${monthLabel}`, 5, 38);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(67, 97, 238);
  pdf.text(`${ticket.faceValue.toFixed(2)} EUR`, 5, 48);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.5);
  pdf.setTextColor(110, 110, 115);
  pdf.text(`Subvention employeur : ${ticket.subsidy.toFixed(2)} EUR`, 5, 53);

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
