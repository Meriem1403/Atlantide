import { useState, useMemo, useCallback } from 'react';
import { resolvePrimaryMonth, formatMonthLabel } from '../../utils/monthUtils';
import {
  LogOut, Scan, History, FileText, CheckCircle,
  Upload, BarChart3, ChevronRight, TrendingUp, Menu,
  Euro, Ticket,
} from 'lucide-react';
import { ProviderScanner } from './ProviderScanner';
import { Ticket as TicketType, ProviderInvoice, AppState, CurrentUser } from '../../types';
import { Pagination } from '../shared/Pagination';
import { MonthInput } from '../shared/FilterSelect';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Page = 'dashboard' | 'scanner' | 'history' | 'invoices' | 'invoice-form';
const PER_PAGE = 8;

interface Props {
  user: CurrentUser;
  state: AppState;
  onValidate: (number: string, providerId: string, providerName: string) => Promise<{ success: boolean; message: string }>;
  onSubmitInvoice: (inv: Omit<ProviderInvoice, 'id' | 'submittedAt' | 'status'>) => void;
  onLogout: () => void;
}

export function ProviderApp({ user, state, onValidate, onSubmitInvoice, onLogout }: Props) {
  const [page, setPage] = useState<Page>('dashboard');
  const [histPage, setHistPage] = useState(1);
  const [invPage, setInvPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const myValidations = state.tickets.filter(t => t.status === 'used' && t.providerId === user.profileId);
  const myInvoices = state.providerInvoices.filter(i => i.providerId === user.profileId);

  const thisMonth = useMemo(() => {
    const months = [...new Set(myValidations.map((t) => t.month).filter(Boolean))].sort();
    if (months.length) return months[months.length - 1];
    return resolvePrimaryMonth(state.tickets);
  }, [myValidations, state.tickets]);

  const monthLabel = formatMonthLabel(thisMonth);
  const monthShort = new Date(`${thisMonth}-15`).toLocaleDateString('fr-FR', { month: 'short' });

  // Invoice form
  const [invMonth, setInvMonth] = useState(thisMonth);
  const [invNumber, setInvNumber] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [invFile, setInvFile] = useState<{ name: string; data: string } | null>(null);

  const monthValid = myValidations.filter(t => t.month === thisMonth);
  const totalAmount = monthValid.reduce((s, t) => s + t.faceValue, 0);
  const totalSubsidy = monthValid.reduce((s, t) => s + t.subsidy, 0);

  const pagedHist = myValidations.slice().reverse().slice((histPage - 1) * PER_PAGE, histPage * PER_PAGE);
  const pagedInv = myInvoices.slice().reverse().slice((invPage - 1) * PER_PAGE, invPage * PER_PAGE);

  const handleValidateTicket = useCallback(
    (number: string) => onValidate(number, user.profileId, user.name),
    [onValidate, user.profileId, user.name],
  );

  const todayValidations = myValidations.filter(
    (t) => t.usedAt && new Date(t.usedAt).toDateString() === new Date().toDateString(),
  );
  const todayCount = todayValidations.length;
  const todayAmount = todayValidations.reduce((s, t) => s + t.faceValue, 0);

  const handleSubmitInvoice = () => {
    onSubmitInvoice({
      providerId: user.profileId, providerName: user.name, month: invMonth,
      ticketCount: invMonthValid.length, totalAmount: invTotal, subsidyAmount: invSubsidy,
      invoiceNumber: invNumber, notes: invNotes,
      fileName: invFile?.name ?? '', fileData: invFile?.data ?? '',
    });
    setPage('invoices');
    setInvNumber(''); setInvNotes(''); setInvFile(null);
  };

  const invMonthValid = myValidations.filter(t => t.month === invMonth);
  const invTotal = invMonthValid.reduce((s, t) => s + t.faceValue, 0);
  const invSubsidy = invMonthValid.reduce((s, t) => s + t.subsidy, 0);
  const alreadySubmitted = myInvoices.find(i => i.month === invMonth);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setInvFile({ name: file.name, data: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const chartData = useMemo(() => {
    const [year, month] = thisMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData: Record<string, { count: number; amount: number }> = {};
    monthValid.forEach((t) => {
      if (!t.usedAt) return;
      const d = String(new Date(t.usedAt).getDate());
      if (!dailyData[d]) dailyData[d] = { count: 0, amount: 0 };
      dailyData[d].count += 1;
      dailyData[d].amount += t.faceValue;
    });
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1);
      const entry = dailyData[day] || { count: 0, amount: 0 };
      return {
        jour: `${day} ${monthShort}`,
        validations: entry.count,
        montant: Math.round(entry.amount * 100) / 100,
      };
    });
  }, [thisMonth, monthShort, monthValid]);

  const NAV = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
    { id: 'scanner', label: 'Scanner', icon: Scan },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'invoices', label: 'Mes Factures', icon: FileText },
  ] as const;

  const Sidebar = () => (
    <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-border h-full">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FFF6EB' }}>
            <Scan className="w-5 h-5" style={{ color: '#FF9500' }} />
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 13, fontWeight: 700 }} className="truncate">{user.name}</div>
            <div style={{ fontSize: 11, color: '#6E6E73' }}>Prestataire</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
            style={{ background: page === n.id ? '#FFF6EB' : 'transparent', color: page === n.id ? '#FF9500' : '#6E6E73', fontSize: 14, fontWeight: page === n.id ? 600 : 400 }}>
            <n.icon className="w-4 h-4 shrink-0" />{n.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </aside>
  );

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const DashboardPage = () => (
    <div className="p-6 lg:p-8 space-y-8 overflow-y-auto h-full">
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>Tableau de bord</h1>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 4 }}>{monthLabel} — Vue d&apos;ensemble</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tickets scannés', value: monthValid.length, sub: 'ce mois', color: '#FF9500', bg: 'linear-gradient(135deg, #FFF6EB, #FFFBF0)' },
          { label: 'Montant total', value: `${totalAmount.toFixed(0)} €`, sub: 'à facturer', color: '#0071E3', bg: 'linear-gradient(135deg, #EBF5FF, #F0F9FF)' },
          { label: 'Subventions', value: `${totalSubsidy.toFixed(0)} €`, sub: 'employeur', color: '#34C759', bg: 'linear-gradient(135deg, #EDFBF1, #F0FDF4)' },
          { label: 'Total validations', value: myValidations.length, sub: 'depuis le début', color: '#AF52DE', bg: 'linear-gradient(135deg, #F8F0FF, #FCF5FF)' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-5" style={{ background: kpi.bg, border: `1px solid ${kpi.color}18` }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: kpi.color, letterSpacing: '-0.5px' }}>{kpi.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginTop: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Facturation card */}
      <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Récapitulatif à facturer</h3>
            <p style={{ fontSize: 13, color: '#6E6E73', marginTop: 2 }}>{monthLabel}</p>
          </div>
          <button onClick={() => { setInvMonth(thisMonth); setPage('invoice-form'); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: '#FF9500', color: 'white', fontSize: 14, fontWeight: 600 }}>
            <Upload className="w-4 h-4" /> Émettre une facture
          </button>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          {[
            { label: 'Tickets consommés', value: monthValid.length.toString(), color: '#FF9500' },
            { label: 'Subventions à recevoir', value: `${totalSubsidy.toFixed(2)} €`, color: '#34C759' },
            { label: 'Total facture', value: `${totalAmount.toFixed(2)} €`, color: '#0071E3' },
          ].map(item => (
            <div key={item.label} className="px-6 py-5 text-center">
              <div style={{ fontSize: 26, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 lg:p-8" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Activité de validation</h3>
            <p style={{ fontSize: 13, color: '#6E6E73', marginTop: 4 }}>{monthLabel} — tickets scannés par jour</p>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 22, fontWeight: 800, color: '#FF9500' }}>{monthValid.length}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>total ce mois</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="validGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9500" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#FF9500" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="jour" tick={{ fill: '#9CA3AF', fontSize: 10 }} interval={2} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ borderRadius: 12, fontSize: 13, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              formatter={(value: number, name: string) => [
                name === 'validations' ? `${value} ticket${value > 1 ? 's' : ''}` : `${value.toFixed(2)} €`,
                name === 'validations' ? 'Validations' : 'Montant',
              ]}
            />
            <Area type="monotone" dataKey="validations" stroke="#FF9500" strokeWidth={2.5} fill="url(#validGradient)" dot={{ r: 3, fill: '#FF9500', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent validations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Dernières validations</h3>
          <button onClick={() => setPage('history')} className="flex items-center gap-1 text-primary" style={{ fontSize: 14, fontWeight: 500 }}>
            Voir tout <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {monthValid.slice(-5).reverse().map(t => (
            <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#EDFBF1' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#34C759' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.agentName}</div>
                <div style={{ fontSize: 12, color: '#6E6E73', fontFamily: 'monospace' }}>{t.number}</div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: 15, fontWeight: 700 }}>{t.faceValue.toFixed(2)} €</div>
                <div style={{ fontSize: 11, color: '#AEAEB2' }}>{t.usedAt ? new Date(t.usedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div>
              </div>
            </div>
          ))}
          {monthValid.length === 0 && (
            <div className="py-8 text-center rounded-2xl bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 14, color: '#6E6E73' }}>Aucune validation ce mois</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── History ───────────────────────────────────────────────────────────────
  const HistoryPage = () => (
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>Historique</h1>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 4 }}>{myValidations.length} tickets validés au total</p>
      </div>
      <div className="space-y-3">
        {pagedHist.length === 0 ? (
          <div className="py-16 rounded-3xl bg-white flex flex-col items-center gap-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <Ticket className="w-10 h-10 text-muted-foreground" />
            <p style={{ fontSize: 14, color: '#6E6E73' }}>Aucune validation</p>
          </div>
        ) : pagedHist.map(t => (
          <div key={t.id} className="flex items-center gap-4 p-5 rounded-2xl bg-white transition-all hover:shadow-md" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#EDFBF1' }}>
              <CheckCircle className="w-6 h-6" style={{ color: '#34C759' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.agentName}</div>
              <div style={{ fontSize: 12, color: '#6E6E73', fontFamily: 'monospace', marginTop: 2 }}>{t.number}</div>
              <div style={{ fontSize: 12, color: '#AEAEB2', marginTop: 2 }}>
                {t.usedAt ? new Date(t.usedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1D1F' }}>{t.faceValue.toFixed(2)} €</div>
              <div style={{ fontSize: 12, color: '#34C759', fontWeight: 600, marginTop: 2 }}>Sub: {t.subsidy.toFixed(2)} €</div>
              <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 2 }}>
                {new Date(t.month + '-15').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pagination page={histPage} total={myValidations.length} perPage={PER_PAGE} onChange={setHistPage} />
    </div>
  );

  // ── Invoices ──────────────────────────────────────────────────────────────
  const statusMap = { submitted: { label: 'En attente', color: '#FF9500', bg: '#FFF6EB' }, approved: { label: 'Approuvée', color: '#34C759', bg: '#EDFBF1' }, rejected: { label: 'Rejetée', color: '#FF3B30', bg: '#FFF0EF' } };

  const InvoicesPage = () => (
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>Mes Factures</h1>
          <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 4 }}>{myInvoices.length} facture(s) soumise(s)</p>
        </div>
        <button onClick={() => setPage('invoice-form')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl transition-all hover:opacity-90"
          style={{ background: '#FF9500', color: 'white', fontSize: 14, fontWeight: 600 }}>
          <Upload className="w-4 h-4" /> Nouvelle facture
        </button>
      </div>

      <div className="grid gap-4">
        {pagedInv.length === 0 ? (
          <div className="py-16 rounded-3xl bg-white flex flex-col items-center gap-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <FileText className="w-10 h-10 text-muted-foreground" />
            <p style={{ fontSize: 14, color: '#6E6E73' }}>Aucune facture soumise</p>
            <button onClick={() => setPage('invoice-form')}
              className="px-5 py-2.5 rounded-xl" style={{ background: '#FF9500', color: 'white', fontSize: 14, fontWeight: 600 }}>
              Soumettre ma première facture
            </button>
          </div>
        ) : pagedInv.map(inv => {
          const st = statusMap[inv.status];
          return (
            <div key={inv.id} className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div className="p-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                      {new Date(inv.month + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>
                      {st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6E6E73', fontFamily: 'monospace' }}>N° {inv.invoiceNumber}</div>
                  <div style={{ fontSize: 12, color: '#AEAEB2', marginTop: 2 }}>
                    Soumise le {new Date(inv.submittedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#FF9500' }}>{inv.totalAmount.toFixed(2)} €</div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                {[
                  { label: 'Tickets', value: inv.ticketCount.toString() },
                  { label: 'Subventions', value: `${inv.subsidyAmount.toFixed(2)} €` },
                  { label: 'Total', value: `${inv.totalAmount.toFixed(2)} €` },
                ].map(item => (
                  <div key={item.label} className="px-4 py-3 text-center">
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 1 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {inv.reviewNote && (
                <div className="px-5 py-3 border-t border-border" style={{ background: st.bg }}>
                  <span style={{ fontSize: 13, color: st.color, fontWeight: 500 }}>💬 {inv.reviewNote}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Pagination page={invPage} total={myInvoices.length} perPage={PER_PAGE} onChange={setInvPage} />
    </div>
  );

  // ── Invoice form ──────────────────────────────────────────────────────────
  const InvoiceFormPage = () => (
    <div className="p-6 lg:p-8 overflow-y-auto h-full">
      <button onClick={() => setPage('invoices')} className="flex items-center gap-1.5 mb-6" style={{ fontSize: 14, fontWeight: 500, color: '#FF9500' }}>
        <ChevronRight className="w-4 h-4 rotate-180" /> Retour aux factures
      </button>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px', marginBottom: 24 }}>Soumettre une facture</h1>

      <div className="max-w-2xl space-y-5">
        {/* Month selector */}
        <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Période de facturation</h3>
          <MonthInput variant="modal" value={invMonth} onChange={e => setInvMonth(e.target.value)} className="py-3" style={{ fontSize: 15 }} />

          {/* Auto-computed summary */}
          {invMonthValid.length > 0 ? (
            <div className="mt-4 rounded-2xl overflow-hidden border border-border">
              <div className="px-4 py-3" style={{ background: '#FFF6EB' }}>
                <div style={{ fontSize: 12, color: '#FF9500', fontWeight: 700 }}>
                  {new Date(invMonth + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()} — {invMonthValid.length} TICKETS
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                {[
                  { label: 'Tickets', value: invMonthValid.length.toString() },
                  { label: 'Subventions', value: `${invSubsidy.toFixed(2)} €` },
                  { label: 'Total', value: `${invTotal.toFixed(2)} €` },
                ].map(item => (
                  <div key={item.label} className="px-4 py-3 text-center">
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#FF9500' }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 rounded-xl" style={{ background: '#FFF0EF' }}>
              <p style={{ fontSize: 13, color: '#FF3B30' }}>Aucun ticket validé pour ce mois.</p>
            </div>
          )}

          {alreadySubmitted && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: '#FFF6EB' }}>
              <AlertCircle className="w-4 h-4" style={{ color: '#FF9500' }} />
              <span style={{ fontSize: 13, color: '#FF9500', fontWeight: 500 }}>Une facture a déjà été soumise pour ce mois.</span>
            </div>
          )}
        </div>

        {/* Invoice details */}
        <div className="rounded-2xl bg-white p-6 space-y-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Informations de la facture</h3>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: '#1D1D1F' }}>
              Numéro de facture <span style={{ color: '#FF3B30' }}>*</span>
            </label>
            <input value={invNumber} onChange={e => setInvNumber(e.target.value)} placeholder="FA-2026-001"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary"
              style={{ background: '#F5F5F7', fontSize: 15 }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: '#1D1D1F' }}>Notes</label>
            <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} rows={3}
              placeholder="Informations complémentaires…"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary resize-none"
              style={{ background: '#F5F5F7', fontSize: 15 }} />
          </div>
        </div>

        {/* File upload */}
        <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Joindre la facture</h3>
          <label className="block cursor-pointer">
            <div className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed hover:border-primary/50 transition-colors"
              style={{ background: '#F5F5F7', borderColor: invFile ? '#FF9500' : 'rgba(0,0,0,0.12)' }}>
              {invFile ? (
                <>
                  <FileText className="w-10 h-10" style={{ color: '#FF9500' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>{invFile.name}</div>
                  <span style={{ fontSize: 12, color: '#FF9500', fontWeight: 500 }}>Cliquer pour remplacer</span>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>Glisser un fichier ou cliquer</div>
                    <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 4 }}>PDF, JPG, PNG acceptés</div>
                  </div>
                </>
              )}
            </div>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmitInvoice}
          disabled={!invNumber.trim() || invMonthValid.length === 0}
          className="w-full py-4 rounded-2xl transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: '#FF9500', color: 'white', fontSize: 16, fontWeight: 700 }}
        >
          Soumettre la facture — {invTotal.toFixed(2)} €
        </button>
      </div>
    </div>
  );

  const pageContent: Record<Exclude<Page, 'scanner'>, JSX.Element> = {
    dashboard: <DashboardPage />,
    history: <HistoryPage />,
    invoices: <InvoicesPage />,
    'invoice-form': <InvoiceFormPage />,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex h-full"><Sidebar /></div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl"><Sidebar /></div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b border-border px-4 h-14 flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent">
            <Menu className="w-5 h-5" />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{NAV.find(n => n.id === page)?.label ?? 'Facture'}</span>
        </header>
        <div className="flex-1 overflow-hidden" style={{ background: '#F5F5F7' }}>
          {page === 'scanner' ? (
            <ProviderScanner
              onValidate={handleValidateTicket}
              todayCount={todayCount}
              todayAmount={todayAmount}
            />
          ) : (
            pageContent[page]
          )}
        </div>
      </div>
    </div>
  );
}
