import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import sizeOf from 'image-size';
import sharp from 'sharp';

const monthLabelCache = new Map();

function fitInBox(nw, nh, maxW, maxH) {
  const ratio = Math.min(maxW / nw, maxH / nh, 1);
  return { w: nw * ratio, h: nh * ratio };
}

export function resolveLogoFit(orgLogo) {
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

async function prepareLogoForPdf(orgLogo) {
  if (!orgLogo) return { logo: '', logoFit: null };

  try {
    const base64 = orgLogo.includes(',') ? orgLogo.split(',')[1] : orgLogo;
    const input = Buffer.from(base64, 'base64');
    const resized = await sharp(input)
      .resize(220, 130, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const { width = 1, height = 1 } = await sharp(resized).metadata();
    const fit = fitInBox(width, height, 22, 13);
    return {
      logo: `data:image/png;base64,${resized.toString('base64')}`,
      logoFit: { w: fit.w, h: fit.h, ext: 'PNG' },
    };
  } catch {
    return { logo: '', logoFit: null };
  }
}

function getMonthLabel(month) {
  if (!monthLabelCache.has(month)) {
    monthLabelCache.set(
      month,
      new Date(`${month}-15`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    );
  }
  return monthLabelCache.get(month);
}

async function mapWithConcurrency(items, concurrency, fn) {
  if (items.length === 0) return;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      await fn(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
}

export async function prepareExportAssets(tickets, orgLogo = '') {
  const [logoAssets, qrByTicketId] = await Promise.all([
    prepareLogoForPdf(orgLogo),
    (async () => {
      const map = new Map();
      const unique = [...new Map(tickets.map((t) => [t.id, t])).values()];
      await mapWithConcurrency(unique, 24, async (ticket) => {
        const buffer = await QRCode.toBuffer(ticket.qrData, {
          type: 'png',
          width: 96,
          margin: 0,
          errorCorrectionLevel: 'L',
        });
        map.set(ticket.id, buffer);
      });
      return map;
    })(),
  ]);

  return {
    logo: logoAssets.logo,
    logoFit: logoAssets.logoFit,
    qrByTicketId,
  };
}

function buildTicketPage(pdf, ticket, orgName, orgLogo, logoFit, qrImage, pageIndex) {
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

  pdf.addImage(qrImage, 'PNG', qrLeft, 18, 24, 24);

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
  const monthY = 33 + nameLines.length * 4 + 1;
  pdf.text(`Valable : ${getMonthLabel(ticket.month)}`, 5, monthY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(67, 97, 238);
  pdf.text(`${Number(ticket.faceValue).toFixed(2)} EUR`, 5, monthY + 9);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.setTextColor(110, 110, 115);
  const contribution = Math.max(0, Number(ticket.faceValue) - Number(ticket.subsidy));
  pdf.text(`Subvention employeur : ${Number(ticket.subsidy).toFixed(2)} EUR`, 5, monthY + 13);
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

export function buildTicketsPdfBuffer(tickets, orgName, orgLogo = '', assets) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [60, 85],
    compress: true,
  });

  if (tickets.length === 0) {
    return Buffer.from(pdf.output('arraybuffer'));
  }

  const logoFit = assets?.logoFit ?? resolveLogoFit(orgLogo);
  const logoImage = assets?.logo || orgLogo;

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    const qrImage = assets?.qrByTicketId?.get(ticket.id);
    if (!qrImage) {
      throw new Error(`QR manquant pour le ticket ${ticket.number}`);
    }
    buildTicketPage(pdf, ticket, orgName, logoImage, logoFit, qrImage, i);
  }

  return Buffer.from(pdf.output('arraybuffer'));
}
