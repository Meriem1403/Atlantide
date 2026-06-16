import { useState, useMemo } from 'react';
import { resolvePrimaryMonth, chartMonths, formatMonthLabel } from '../../utils/monthUtils';
import {
  LayoutDashboard, Users, Ticket, Euro, Store, FileText, Settings,
  LogOut, Menu, TrendingUp, CheckCircle, AlertCircle, BarChart2,
  ChevronRight, Activity, Calendar
} from 'lucide-react';
import {
  AppState, Agent, Provider, SubventionConfig, Ticket as TicketType,
  ProviderInvoice, CurrentUser
} from '../../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { AgentsCRUD } from './AgentsCRUD';
import { ProvidersCRUD } from './ProvidersCRUD';
import { SubventionsCRUD } from './SubventionsCRUD';
import { TicketsCRUD } from './TicketsCRUD';
import { InvoicesAdmin } from './InvoicesAdmin';
import { SettingsPage } from './SettingsPage';
import { OrgLogo } from '../shared/OrgLogo';
import { APP_NAME } from '../../config/branding';

export type AdminRoute =
  | 'dashboard'
  | 'agents' | 'agents/new' | `agents/edit/${string}`
  | 'tickets' | 'tickets/generate' | 'tickets/export' | `tickets/view/${string}`
  | 'subventions' | 'subventions/new' | `subventions/edit/${string}`
  | 'providers' | 'providers/new' | `providers/edit/${string}`
  | 'invoices' | `invoices/view/${string}`
  | 'settings';

interface Props {
  state: AppState;
  user: CurrentUser;
  onLogout: () => void;
  onCreateAgent: (a: Omit<Agent, 'id' | 'createdAt'>) => void;
  onUpdateAgent: (id: string, a: Partial<Agent>) => void;
  onDeleteAgent: (id: string) => void;
  onCreateProvider: (p: Omit<Provider, 'id' | 'createdAt'>) => void;
  onUpdateProvider: (id: string, p: Partial<Provider>) => void;
  onDeleteProvider: (id: string) => void;
  onCreateSubvention: (s: Omit<SubventionConfig, 'id' | 'createdAt'>) => void;
  onUpdateSubvention: (id: string, s: Partial<SubventionConfig>) => void;
  onDeleteSubvention: (id: string) => void;
  onGenerateTicketsBatch: (month: string, items: import('../../api').TicketGenerationItem[]) => Promise<{ agentCount: number; totalTickets: number }>;
  onCancelTicket: (id: string) => void;
  onDeleteTicket: (id: string) => void;
  onApproveInvoice: (id: string, note: string) => void;
  onRejectInvoice: (id: string, note: string) => void;
  onUpdateSettings: (orgName: string, orgLogo: string, notificationEmail?: string, mailFrom?: string) => Promise<void>;
}

const CHART_COLORS = ['#4361EE', '#2DC653', '#F59E0B', '#8B5CF6', '#E63946'];

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'subventions', label: 'Subventions', icon: Euro },
  { id: 'providers', label: 'Prestataires', icon: Store },
  { id: 'invoices', label: 'Factures reçues', icon: FileText },
  { id: 'settings', label: 'Paramètres', icon: Settings },
] as const;

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardContent({ state, navigate }: { state: AppState; navigate: (r: AdminRoute) => void }) {
  const thisMonth = useMemo(
    () => resolvePrimaryMonth(state.tickets, state.monthlyPlans),
    [state.tickets, state.monthlyPlans],
  );
  const months = useMemo(
    () => chartMonths(thisMonth, state.tickets.map(t => t.month)),
    [thisMonth, state.tickets],
  );
  const monthLabel = formatMonthLabel(thisMonth);

  const monthTickets = state.tickets.filter(t => t.month === thisMonth);
  const usedThisMonth = monthTickets.filter(t => t.status === 'used');
  const pendingInvoices = state.providerInvoices.filter(i => i.status === 'submitted').length;
  const totalSubsidyGenerated = monthTickets.reduce((s, t) => s + t.subsidy, 0);
  const totalSubsidyUsed = usedThisMonth.reduce((s, t) => s + t.subsidy, 0);

  // Bar chart data
  const barData = months.map(m => ({
    bar_lbl: new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'short' }),
    generes: state.tickets.filter(t => t.month === m).length,
    utilises: state.tickets.filter(t => t.month === m && t.status === 'used').length,
  }));

  // Agent utilization
  const agentData = state.agents.map((a, i) => ({
    agentId: a.id,
    name: a.name.split(' ')[1] ?? a.name,
    total: state.tickets.filter(t => t.agentId === a.id && t.month === thisMonth).length,
    used: state.tickets.filter(t => t.agentId === a.id && t.month === thisMonth && t.status === 'used').length,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter(a => a.total > 0).sort((a, b) => b.total - a.total).slice(0, 15);

  // Pie by agent
  const pieData = agentData.filter(d => d.used > 0).map(d => ({ id: d.agentId, label: d.name, value: d.used, color: d.color }));

  // Monthly subsidy line
  const subsidyLine = months.map(m => ({
    area_lbl: new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'short' }),
    subvention: Math.round(state.tickets.filter(t => t.month === m && t.status === 'used').reduce((s, t) => s + t.subsidy, 0)),
    tickets: state.tickets.filter(t => t.month === m && t.status === 'used').length,
  }));

  // Provider breakdown
  const provData = state.providers.map(p => ({
    name: p.name.split(' ')[1] ?? p.name,
    value: state.tickets.filter(t => t.providerId === p.id && t.month === thisMonth).length,
  })).filter(p => p.value > 0);

  return (
    <div className="p-6 lg:p-8 space-y-8 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Tableau de bord</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>{monthLabel} — {state.orgName}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#EEF2FF', border: '1px solid #4361EE30' }}>
          <Activity className="w-4 h-4" style={{ color: '#4361EE' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4361EE' }}>En direct</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tickets générés', value: monthTickets.length, sub: 'ce mois', color: '#4361EE', bg: '#EEF2FF', icon: Ticket, route: 'tickets' as AdminRoute },
          { label: 'Utilisés', value: usedThisMonth.length, sub: `${monthTickets.length ? Math.round(usedThisMonth.length / monthTickets.length * 100) : 0}% du total`, color: '#2DC653', bg: '#DCFCE7', icon: CheckCircle, route: 'tickets' as AdminRoute },
          { label: 'Coût employeur', value: `${totalSubsidyGenerated.toFixed(0)} €`, sub: 'tickets générés', color: '#F59E0B', bg: '#FEF3C7', icon: Euro, route: 'subventions' as AdminRoute },
          { label: 'Factures en attente', value: pendingInvoices, sub: 'à traiter', color: '#E63946', bg: '#FEE2E2', icon: AlertCircle, route: 'invoices' as AdminRoute },
        ].map(kpi => (
          <button key={kpi.label} onClick={() => navigate(kpi.route)}
            className="rounded-2xl p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ background: 'white', border: `1px solid ${kpi.color}18`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: '#D1D5DB' }} />
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: kpi.color, letterSpacing: '-0.5px' }}>{kpi.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{kpi.sub}</div>
          </button>
        ))}
      </div>

      {/* Row 1: Bar + Subsidy Line */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Tickets générés vs utilisés</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={barData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="bar_lbl" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar key="bar-admin-generes" dataKey="generes" name="admin_dash_generes" fill="#4361EE" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              <Bar key="bar-admin-utilises" dataKey="utilises" name="admin_dash_utilises" fill="#2DC653" radius={[5, 5, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Évolution des subventions</h3>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={subsidyLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
              <XAxis dataKey="area_lbl" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(v: number) => [`${v} €`, 'Subvention']} />
              <Line key="line-admin-sub" type="monotone" dataKey="subvention" name="admin_line_sub"
                stroke="#4361EE" strokeWidth={2.5} dot={{ fill: '#4361EE', r: 4, strokeWidth: 0 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Pie + Agent bars */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Utilisation par agent ({monthLabel})</h3>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center" style={{ color: '#9CA3AF', fontSize: 13 }}>Aucune donnée</div>
          ) : (
            <div className="flex items-center gap-4">
              <PieChart width={120} height={120}>
                <Pie data={pieData} cx={55} cy={55} innerRadius={34} outerRadius={55} dataKey="value" nameKey="id" strokeWidth={0} isAnimationActive={false}>
                  {pieData.map(e => <Cell key={`pie-cell-${e.id}`} fill={e.color} />)}
                </Pie>
              </PieChart>
              <div className="flex-1 space-y-2">
                {pieData.map(e => (
                  <div key={e.id} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                    <span className="flex-1 truncate" style={{ fontSize: 12 }}>{e.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Taux d'utilisation par agent</h3>
          <div className="space-y-3">
            {agentData.map(a => {
              const pct = a.total > 0 ? Math.round(a.used / a.total * 100) : 0;
              return (
                <div key={a.agentId}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{a.used}/{a.total} — {pct}%</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 8, background: '#F0F2F7' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: a.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Recent activity */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Dernières validations</h3>
            <button onClick={() => navigate('tickets')} style={{ fontSize: 12, color: '#4361EE', fontWeight: 600 }}>Tout voir</button>
          </div>
          <div className="divide-y divide-border">
            {state.tickets.filter(t => t.status === 'used').slice(-6).reverse().map(t => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#DCFCE7' }}>
                  <CheckCircle className="w-4 h-4" style={{ color: '#2DC653' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.agentName}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>{t.number}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.faceValue.toFixed(2)} €</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>{t.providerName}</div>
                </div>
              </div>
            ))}
            {state.tickets.filter(t => t.status === 'used').length === 0 && (
              <div className="px-6 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Aucune validation</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Récapitulatif financier</h3>
            <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: `Valeur totale tickets (${monthLabel})`, value: `${monthTickets.reduce((s, t) => s + t.faceValue, 0).toFixed(2)} €`, color: '#374151' },
              { label: 'Coût employeur (générés)', value: `${totalSubsidyGenerated.toFixed(2)} €`, color: '#4361EE' },
              { label: 'Subventions versées (utilisés)', value: `${totalSubsidyUsed.toFixed(2)} €`, color: '#F59E0B' },
              { label: 'Tickets utilisés', value: `${usedThisMonth.length}`, color: '#8B5CF6' },
              { label: 'Total factures soumises', value: `${state.providerInvoices.reduce((s, i) => s + i.totalAmount, 0).toFixed(2)} €`, color: '#E63946' },
              { label: 'Agents actifs', value: `${state.agents.filter(a => a.active).length} / ${state.agents.length}`, color: '#2DC653' },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span style={{ fontSize: 13, color: '#6B7280' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminApp ─────────────────────────────────────────────────────────────
export function AdminApp(props: Props) {
  const { state, user, onLogout } = props;
  const [route, setRoute] = useState<AdminRoute>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = (r: AdminRoute) => { setRoute(r); setMobileOpen(false); };

  const pendingInvoices = state.providerInvoices.filter(i => i.status === 'submitted').length;
  const currentSection = route.split('/')[0];

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: '#1C1C2E' }}>
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <OrgLogo src={state.orgLogo} size={36} onDark />
          <div className="min-w-0">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }} className="truncate">{state.orgName || APP_NAME}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{APP_NAME}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = currentSection === item.id;
          return (
            <button key={item.id} onClick={() => navigate(item.id as AdminRoute)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left relative"
              style={{
                background: active ? '#4361EE' : 'transparent',
                color: active ? 'white' : '#94A3B8',
                fontSize: 14, fontWeight: active ? 600 : 400,
              }}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {item.id === 'invoices' && pendingInvoices > 0 && (
                <span className="ml-auto rounded-full text-white flex items-center justify-center"
                  style={{ fontSize: 10, fontWeight: 700, background: '#E63946', minWidth: 18, height: 18, padding: '0 4px' }}>
                  {pendingInvoices}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="px-3 py-2 mb-1">
          <div style={{ fontSize: 12, color: '#64748B' }}>{user.name}</div>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
          style={{ color: '#64748B', fontSize: 14 }}>
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (route === 'dashboard') return <DashboardContent state={state} navigate={navigate} />;
    if (route.startsWith('agents')) return (
      <AgentsCRUD route={route} navigate={navigate}
        agents={state.agents}
        onCreate={props.onCreateAgent} onUpdate={props.onUpdateAgent} onDelete={props.onDeleteAgent} />
    );
    if (route.startsWith('tickets')) return (
      <TicketsCRUD route={route} navigate={navigate}
        tickets={state.tickets} agents={state.agents} subventions={state.subventions}
        monthlyPlans={state.monthlyPlans}
        orgName={state.orgName} orgLogo={state.orgLogo}
        onGenerateBatch={props.onGenerateTicketsBatch} onCancel={props.onCancelTicket} onDelete={props.onDeleteTicket} />
    );
    if (route.startsWith('subventions')) return (
      <SubventionsCRUD route={route} navigate={navigate}
        subventions={state.subventions} agents={state.agents}
        onCreate={props.onCreateSubvention} onUpdate={props.onUpdateSubvention} onDelete={props.onDeleteSubvention} />
    );
    if (route.startsWith('providers')) return (
      <ProvidersCRUD route={route} navigate={navigate}
        providers={state.providers}
        onCreate={props.onCreateProvider} onUpdate={props.onUpdateProvider} onDelete={props.onDeleteProvider} />
    );
    if (route.startsWith('invoices')) return (
      <InvoicesAdmin route={route} navigate={navigate}
        invoices={state.providerInvoices} providers={state.providers}
        onApprove={props.onApproveInvoice} onReject={props.onRejectInvoice} />
    );
    if (route === 'settings') return (
      <SettingsPage orgName={state.orgName} orgLogo={state.orgLogo} notificationEmail={state.notificationEmail ?? ''} mailFrom={state.mailFrom ?? ''} onSave={props.onUpdateSettings} />
    );
    return null;
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F2F7' }}>
      {/* Desktop sidebar */}
      <aside className="w-56 shrink-0 hidden md:block"><Sidebar /></aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-border px-4 h-14 flex items-center gap-3 shrink-0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <button onClick={() => setMobileOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent">
            <Menu className="w-5 h-5" />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{NAV.find(n => n.id === currentSection)?.label ?? 'Admin'}</span>
        </header>
        <main className="flex-1 overflow-hidden">{renderContent()}</main>
      </div>
    </div>
  );
}
