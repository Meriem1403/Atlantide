import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import sizeOf from 'image-size';

function fitInBox(nw, nh, maxW, maxH) {
  const ratio = Math.min(maxW / nw, maxH / nh, 1);
  return { w: nw * ratio, h: nh * ratio };
}

function resolveLogoFit(orgLogo) {
  if (!orgLogo) return null;
  try {
    const ext = orgLogo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    const base64 = orgLogo.includes(',') ? orgLogo.split(',')[1] : orgLogo;
    const buffer = Buffer.from(base64, 'base64');
    const { width, height } = sizeOf(buffer);
    const fit = fitInBox(width, height, 22, 13);
    return { w: fit.w, h: fit.h, ext };
  } catch {
    return null;
  }
}

async function prefetchQrCodes(tickets) {
  return Promise.all(
    tickets.map((ticket) => QRCode.toDataURL(ticket.qrData, { width: 200, margin: 1 })),
  );
}

function buildTicketPage(pdf, ticket, orgName, orgLogo, logoFit, qrDataUrl, pageIndex) {
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
  const monthLabel = new Date(`${ticket.month}-15`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  const monthY = 33 + nameLines.length * 4 + 1;
  pdf.text(`Valable : ${monthLabel}`, 5, monthY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(67, 97, 238);
  pdf.text(`${Number(ticket.faceValue).toFixed(2)} EUR`, 5, monthY + 10);

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

export async function buildTicketsPdfBuffer(tickets, orgName, orgLogo = '') {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [60, 85] });
  if (tickets.length === 0) {
    return Buffer.from(pdf.output('arraybuffer'));
  }

  const [logoFit, qrCodes] = await Promise.all([
    Promise.resolve(resolveLogoFit(orgLogo)),
    prefetchQrCodes(tickets),
  ]);

  for (let i = 0; i < tickets.length; i++) {
    buildTicketPage(pdf, tickets[i], orgName, orgLogo, logoFit, qrCodes[i], i);
  }

  return Buffer.from(pdf.output('arraybuffer'));
}
