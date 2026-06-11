// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface UserAccount {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'agent' | 'provider';
  profileId: string;
  name: string;
}

export interface CurrentUser {
  accountId: string;
  role: 'admin' | 'agent' | 'provider';
  profileId: string;
  name: string;
  email?: string;
  mustChangePassword?: boolean;
}

// ─── Domain ───────────────────────────────────────────────────────────────────
export interface Agent {
  id: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  code: string;
  numerotation?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface AgentMonthlyPlan {
  id: string;
  agentId: string;
  agentName?: string;
  month: string;
  serviceName: string;
  ticketCount: number;
  faceValue: number;
  subsidy: number;
  numerotation: string;
  notes: string;
}

export interface Provider {
  id: string;
  name: string;
  address: string;
  siret: string;
  email: string;
  phone: string;
  active: boolean;
  createdAt: string;
}

export interface SubventionConfig {
  id: string;
  label: string;        // free name chosen by admin
  faceValue: number;    // full ticket face value
  subsidy: number;      // employer subsidy amount
  ticketsPerMonth: number;
  appliesTo: 'all' | string[];
  active: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  number: string;
  agentId: string;
  agentName: string;
  month: string;
  faceValue: number;
  subsidy: number;
  agentContribution: number;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  generatedAt: string;
  usedAt?: string;
  providerId?: string;
  providerName?: string;
  qrData: string;
}

export interface ProviderInvoice {
  id: string;
  providerId: string;
  providerName: string;
  month: string;
  ticketCount: number;
  totalAmount: number;
  subsidyAmount: number;
  invoiceNumber: string;
  notes: string;
  fileName: string;
  fileData: string; // base64
  status: 'submitted' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

// ─── App state ────────────────────────────────────────────────────────────────
export interface AppState {
  users: UserAccount[];
  agents: Agent[];
  providers: Provider[];
  subventions: SubventionConfig[];
  tickets: Ticket[];
  providerInvoices: ProviderInvoice[];
  monthlyPlans?: AgentMonthlyPlan[];
  orgName: string;
  orgLogo: string; // base64 or ''
  notificationEmail?: string;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const now = new Date().toISOString();

export const INITIAL_AGENTS: Agent[] = [
  { id: 'ag1', name: 'Marie Dubois', department: 'Direction RH', email: 'm.dubois@mairie.fr', phone: '01 23 45 67 89', code: 'DUB', active: true, createdAt: now },
  { id: 'ag2', name: 'Thomas Martin', department: 'Service Technique', email: 't.martin@mairie.fr', phone: '01 23 45 67 90', code: 'MAR', active: true, createdAt: now },
  { id: 'ag3', name: 'Sophie Leroy', department: 'Comptabilité', email: 's.leroy@mairie.fr', phone: '01 23 45 67 91', code: 'LER', active: true, createdAt: now },
  { id: 'ag4', name: 'Lucas Bernard', department: 'Direction Informatique', email: 'l.bernard@mairie.fr', phone: '01 23 45 67 92', code: 'BER', active: true, createdAt: now },
  { id: 'ag5', name: 'Emma Petit', department: 'Communication', email: 'e.petit@mairie.fr', phone: '01 23 45 67 93', code: 'PET', active: true, createdAt: now },
];

export const INITIAL_PROVIDERS: Provider[] = [
  { id: 'pv1', name: 'La Bonne Fourchette', address: '12 rue du Commerce, 75015 Paris', siret: '123 456 789 00012', email: 'contact@labonnefourchette.fr', phone: '01 45 67 89 01', active: true, createdAt: now },
  { id: 'pv2', name: 'Le Midi Express', address: '8 av. de la République, 75011 Paris', siret: '987 654 321 00098', email: 'contact@lemidiexpress.fr', phone: '01 45 67 89 02', active: true, createdAt: now },
];

export const INITIAL_SUBVENTIONS: SubventionConfig[] = [
  { id: 'sv1', label: 'Standard 2026', faceValue: 9.0, subsidy: 5.4, ticketsPerMonth: 22, appliesTo: 'all', active: true, createdAt: now },
  { id: 'sv2', label: 'Cadres 2026', faceValue: 11.0, subsidy: 6.6, ticketsPerMonth: 22, appliesTo: ['ag3', 'ag4'], active: false, createdAt: now },
];

export const INITIAL_USERS: UserAccount[] = [
  { id: 'u0', username: 'admin', password: 'admin123', role: 'admin', profileId: 'admin', name: 'Service Comptabilité' },
  { id: 'u1', username: 'm.dubois', password: 'marie2026', role: 'agent', profileId: 'ag1', name: 'Marie Dubois' },
  { id: 'u2', username: 't.martin', password: 'thomas2026', role: 'agent', profileId: 'ag2', name: 'Thomas Martin' },
  { id: 'u3', username: 's.leroy', password: 'sophie2026', role: 'agent', profileId: 'ag3', name: 'Sophie Leroy' },
  { id: 'u4', username: 'l.bernard', password: 'lucas2026', role: 'agent', profileId: 'ag4', name: 'Lucas Bernard' },
  { id: 'u5', username: 'e.petit', password: 'emma2026', role: 'agent', profileId: 'ag5', name: 'Emma Petit' },
  { id: 'u6', username: 'lafourchette', password: 'prest123', role: 'provider', profileId: 'pv1', name: 'La Bonne Fourchette' },
  { id: 'u7', username: 'midiexpress', password: 'prest456', role: 'provider', profileId: 'pv2', name: 'Le Midi Express' },
];

export function randomTicketSuffix(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function makeTickets(agents: Agent[], months: { m: string; usedRatio: number }[], faceValue = 9.0, subsidy = 5.4, count = 22): Ticket[] {
  const tickets: Ticket[] = [];
  for (const agent of agents) {
    for (const { m, usedRatio } of months) {
      const [y, mo] = m.split('-');
      const usedCount = Math.round(count * usedRatio);
      for (let i = 1; i <= count; i++) {
        const suffix = randomTicketSuffix();
        const number = `TRM-${y}${mo}-${suffix}`;
        const isUsed = i <= usedCount;
        const genDate = new Date(`${m}-01T08:00:00`);
        const usedDate = isUsed ? new Date(genDate.getTime() + i * 1.1 * 86400000).toISOString() : undefined;
        tickets.push({
          id: `${agent.id}-${m}-${suffix}`,
          number,
          agentId: agent.id,
          agentName: agent.name,
          month: m,
          faceValue,
          subsidy,
          agentContribution: Math.round((faceValue - subsidy) * 100) / 100,
          status: isUsed ? 'used' : 'active',
          generatedAt: genDate.toISOString(),
          usedAt: usedDate,
          providerId: isUsed ? 'pv1' : undefined,
          providerName: isUsed ? 'La Bonne Fourchette' : undefined,
          qrData: JSON.stringify({ number, agentId: agent.id, agentName: agent.name, month: m, value: faceValue }),
        });
      }
    }
  }
  return tickets;
}

export function buildInitialState(): AppState {
  const tickets = makeTickets(
    INITIAL_AGENTS,
    [
      { m: '2026-04', usedRatio: 1 },
      { m: '2026-05', usedRatio: 0.85 },
      { m: '2026-06', usedRatio: 0.27 },
    ]
  );

  return {
    users: INITIAL_USERS,
    agents: INITIAL_AGENTS,
    providers: INITIAL_PROVIDERS,
    subventions: INITIAL_SUBVENTIONS,
    tickets,
    providerInvoices: [],
    orgName: 'Mairie de Paris',
    orgLogo: '',
  };
}

export const AVATAR_COLORS = ['#0071E3', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'];
