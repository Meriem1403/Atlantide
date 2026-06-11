import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const MONTH_MAP = {
  janvier: '01', février: '02', fevrier: '02', mars: '03', avril: '04',
  mai: '05', juin: '06', juillet: '07', août: '08', aout: '08',
  septembre: '09', octobre: '10', novembre: '11', décembre: '12', decembre: '12',
};

export async function readOdsSheets(filePath) {
  const { stdout } = await execFileAsync('unzip', ['-p', filePath, 'content.xml']);
  const xml = stdout.toString();
  const sheets = [];
  const tableRegex = /<table:table[^>]*table:name="([^"]*)"[^>]*>([\s\S]*?)<\/table:table>/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(xml)) !== null) {
    const name = tableMatch[1];
    const tableBody = tableMatch[2];
    const rows = [];
    const rowRegex = /<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableBody)) !== null) {
      const rowXml = rowMatch[1];
      const cells = [];
      const cellRegex = /<table:table-cell([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell([^>]*)\/>/g;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowXml)) !== null) {
        const attrs = cellMatch[1] || cellMatch[3] || '';
        const inner = cellMatch[2] || '';
        const repMatch = attrs.match(/table:number-columns-repeated="(\d+)"/);
        const rep = repMatch ? parseInt(repMatch[1], 10) : 1;
        const texts = [...inner.matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g)].map((m) =>
          m[1].replace(/<[^>]+>/g, '').replace(/&apos;/g, "'").replace(/&lt;/g, '<').trim()
        );
        const val = texts.join(' ').trim();
        for (let i = 0; i < rep; i++) cells.push(val);
      }
      while (cells.length && cells[cells.length - 1] === '') cells.pop();
      if (cells.some((c) => c.trim())) rows.push(cells);
    }
    sheets.push({ name, rows });
  }
  return sheets;
}

export function parseEuro(value) {
  if (!value) return null;
  const m = String(value).replace(/\s/g, '').replace('€', '').replace(',', '.').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
}

export function parseProvidersSheet(rows) {
  const providers = [];
  for (let i = 0; i < rows.length; i++) {
    const line = (rows[i][1] || rows[i][0] || '').trim();
    if (!line.startsWith('-')) continue;
    const phone = (rows[i + 1]?.[1] || rows[i + 1]?.[0] || '').replace(/^Comptabilité\s*/i, '').trim();
    const cleaned = line.replace(/^-\s*/, '');
    const dashParts = cleaned.split(' - ');
    let name = cleaned.replace(/^Restaurant\s+/i, '').trim();
    let city = '';
    if (dashParts.length >= 2) {
      name = dashParts[0].replace(/^Restaurant\s+/i, '').trim();
      city = dashParts[dashParts.length - 1].trim();
    }
    providers.push({
      name,
      city,
      phone: phone.replace(/\s*-\s*$/, ''),
      address: city,
    });
    i += 1;
  }
  return providers;
}

export function monthFromText(text) {
  const lower = text.toLowerCase();
  for (const [label, num] of Object.entries(MONTH_MAP)) {
    const re = new RegExp(`(?:^|[^a-zàâäéèêëïîôùûüç])${label}(?:[^a-zàâäéèêëïîôùûüç]|$)`, 'i');
    if (re.test(lower)) {
      const yearMatch = lower.match(/20\d{2}/);
      return `${yearMatch ? yearMatch[0] : '2026'}-${num}`;
    }
  }
  return '2026-07';
}

function skipRow(name) {
  const u = name.toUpperCase();
  return (
    u.startsWith('SERVICE') || u.startsWith('TOTAL') || u.startsWith('AGENTS DONT') ||
    u.startsWith('CALCUL DES') || name.startsWith('*') || name.startsWith('A noter') ||
    name.startsWith('Je vous') || name.startsWith('A Marseille') || /^\d+$/.test(name)
  );
}

export function parseAgentsSheet(sheetName, rows) {
  const month = monthFromText(`${sheetName} ${rows.flat().join(' ')}`);
  const serviceRow = rows.find((r) => (r.join(' ')).includes('SERVICE'));
  let service = sheetName.replace(/\s*JUILLET.*$/i, '').trim();
  if (serviceRow) {
    const raw = (serviceRow.find((c) => c.includes('SERVICE')) || serviceRow[0] || '').trim();
    service = raw.replace(/^SERVICE-?\s*/i, '').trim();
  }

  const agents = [];
  for (const cells of rows) {
    const nonEmpty = cells.map((c) => c.trim()).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    let nameIdx = 0;
    if (!cells[0]?.trim() && cells[1]?.trim()) nameIdx = 1;
    const name = (cells[nameIdx] || '').trim();
    if (!name || skipRow(name)) continue;

    const ticketRaw = (cells[nameIdx + 1] || '').trim();
    const ticketCount = parseInt(ticketRaw, 10);
    if (!Number.isFinite(ticketCount) && ticketRaw && !/€/.test(ticketRaw)) continue;

    let numerotation = null;
    const notes = [];
    let faceValue = null;

    for (let i = nameIdx + 2; i < cells.length; i++) {
      const c = cells[i].trim();
      if (!c) continue;
      const euro = parseEuro(c);
      if (euro !== null && (/€/.test(c) || euro < 20)) {
        faceValue = euro;
      } else if (/^\d{3,6}$/.test(c)) {
        numerotation = c;
      } else if (!['23', '22', '0', '46', '138', '161', '252', '299'].includes(c)) {
        notes.push(c);
      }
    }

    if (faceValue === null) {
      faceValue = parseEuro(cells.find((c) => /€/.test(c) || /^[34-5][,.\d]/.test(c.trim()))) ?? 5.0;
    }

    agents.push({
      name: name.replace(/\s+/g, ' '),
      service,
      month,
      ticketCount: Number.isFinite(ticketCount) ? ticketCount : 0,
      numerotation,
      notes: notes.length ? notes.join(' · ') : null,
      faceValue,
      subsidy: Math.round(faceValue * 0.6 * 100) / 100,
    });
  }

  return { service, month, agents };
}

export function getDatadocDir() {
  const env = process.env.DATADOC_PATH;
  if (env && fs.existsSync(env)) return env;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(__dirname, '../../../datadoc'),
    path.resolve(process.cwd(), 'datadoc'),
    '/datadoc',
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

export async function loadDatadocFiles(dir = getDatadocDir()) {
  const providersFile = path.join(dir, 'PRESTATAIRES TICKETS REPAS.ods');
  const agentsFile = path.join(dir, 'calcul des tickets repas JUILLET 2026.ods');
  if (!fs.existsSync(providersFile) || !fs.existsSync(agentsFile)) {
    throw new Error(`Fichiers datadoc introuvables dans ${dir}`);
  }

  const providerRows = (await readOdsSheets(providersFile))[0]?.rows || [];
  const providers = parseProvidersSheet(providerRows);

  const fileMonth = monthFromText(path.basename(agentsFile));
  const agentSheets = await readOdsSheets(agentsFile);
  const services = agentSheets.map((s) => {
    const parsed = parseAgentsSheet(s.name, s.rows);
    return { ...parsed, month: fileMonth, agents: parsed.agents.map((a) => ({ ...a, month: fileMonth })) };
  });
  const agents = services.flatMap((s) => s.agents);
  const month = fileMonth;

  return { providers, agents, services, month, dir };
}

export function agentCode(name) {
  const parts = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0].slice(0, 3)}${parts[parts.length - 1].slice(0, 3)}`.toUpperCase();
  return parts[0]?.slice(0, 6).toUpperCase() || 'AGENT';
}
