import { useState, useMemo, useEffect } from 'react';
import { resolvePrimaryMonth, chartMonths, formatMonthLabel, uniqueMonths } from '../../utils/monthUtils';
import { ChangePasswordModal } from '../AuthPages';
import { QRCodeSVG } from 'qrcode.react';
import {
  LogOut, LayoutDashboard, Ticket, History, Download, CheckCircle,
  Clock, ChevronRight, Calendar, Hash, Euro, ArrowLeft,
  Printer, TrendingUp, Menu, X, Lock
} from 'lucide-react';
import { Ticket as TicketType, CurrentUser, AppState } from '../../types';
import { downloadTicketPDF, downloadBatchTicketsPDF } from '../shared/pdfUtils';
import { Pagination } from '../shared/Pagination';
import { TicketVisual } from '../shared/TicketVisual';
import { OrgLogo } from '../shared/OrgLogo';

type Page = 'dashboard' | 'tickets' | 'history';
const AVATAR_COLORS = ['#0071E3', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'];
const PER_PAGE = 12;

interface Props { user: CurrentUser; state: AppState; onLogout: () => void; }

function TicketDetail({
  ticket, orgName, orgLogo, onBack, onClose,
}: {
  ticket: TicketType; orgName: string; orgLogo: string;
  onBack?: () => void; onClose?: () => void;
}) {
  const [downloading, setDownloading] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#F0F2F7' }}>
      <div className="flex items-center gap-3 px-6 lg:px-10 pt-6 pb-2">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 500, color: '#4361EE' }}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto w-full">
        <TicketVisual ticket={ticket} orgName={orgName} orgLogo={orgLogo} />
        <button
          onClick={async () => { setDownloading(true); await downloadTicketPDF(ticket, orgName, orgLogo); setDownloading(false); }}
          disabled={downloading}
          className="w-full mt-6 flex items-center justify-center gap-3 py-3.5 rounded-2xl transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#4361EE', color: 'white', fontSize: 15, fontWeight: 600 }}
        >
          <Download className="w-5 h-5" />
          {downloading ? 'Génération du PDF…' : 'Télécharger en PDF'}
        </button>
      </div>
    </div>
  );
}

// ── Ticket card ──────────────────────────────────────────────────────────────
function TicketCard({ ticket, selected, onClick, orgLogo }: { ticket: TicketType; selected: boolean; onClick: () => void; orgLogo: string }) {
  const isUsed = ticket.status === 'used';
  return (
    <button
      onClick={onClick}
      className="rounded-2xl overflow-hidden text-left transition-all duration-200"
      style={{
        background: 'white',
        boxShadow: selected
          ? '0 0 0 2px #0071E3, 0 8px 24px rgba(0,113,227,0.18)'
          : '0 2px 8px rgba(0,0,0,0.07)',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* Gradient top */}
      <div
        className="px-4 py-4 relative overflow-hidden"
        style={{
          background: isUsed
            ? 'linear-gradient(135deg, #8E8E93, #AEAEB2)'
            : selected
            ? 'linear-gradient(135deg, #0055CC, #0071E3)'
            : 'linear-gradient(135deg, #0071E3, #0091FF)',
          minHeight: 90,
        }}
      >
        <div className="flex justify-between items-start mb-2">
          <OrgLogo src={orgLogo} size={28} onDark />
          <span className="px-2 py-0.5 rounded-full text-white" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', background: 'rgba(255,255,255,0.2)' }}>
            {isUsed ? 'UTILISÉ' : 'ACTIF'}
          </span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>
          {ticket.faceValue.toFixed(2)} €
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
          {new Date(ticket.month + '-15').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
        </div>
        <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }} />
      </div>

      {/* White bottom */}
      <div className="px-4 py-3" style={{ background: 'white' }}>
        <div className="flex items-center justify-between">
          <QRCodeSVG
            value={ticket.qrData}
            size={48}
            fgColor={isUsed ? '#C7C7CC' : '#1D1D1F'}
            bgColor="transparent"
          />
          <div className="text-right">
            <div style={{ fontSize: 9, color: '#AEAEB2', fontWeight: 600 }}>SUBVENTION</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#34C759' }}>{ticket.subsidy.toFixed(2)} €</div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AgentApp({ user, state, onLogout }: Props) {
  const primaryMonth = useMemo(() => resolvePrimaryMonth(state.tickets), [state.tickets]);
  const [page, setPage] = useState<Page>('dashboard');
  const [filterMonth, setFilterMonth] = useState(primaryMonth);
  const [showPassword, setShowPassword] = useState(Boolean(user.mustChangePassword));
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'used'>('all');
  const [ticketPage, setTicketPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTicketDetail, setMobileTicketDetail] = useState(false);

  // Garder le ticket affiché synchronisé après validation par un prestataire
  useEffect(() => {
    setSelectedTicket(prev => {
      if (!prev) return prev;
      return state.tickets.find(t => t.id === prev.id) ?? prev;
    });
  }, [state.tickets]);

  const myTickets = state.tickets.filter(t => t.agentId === user.profileId);
  const monthTickets = myTickets.filter(t => t.month === primaryMonth);
  const activeTickets = monthTickets.filter(t => t.status === 'active');
  const usedTickets = monthTickets.filter(t => t.status === 'used');
  const agentInfo = state.agents.find(a => a.id === user.profileId);

  const filteredTickets = myTickets.filter(t => {
    const mOk = !filterMonth || t.month === filterMonth;
    const sOk = filterStatus === 'all' || t.status === filterStatus;
    return mOk && sOk;
  });
  const pagedTickets = filteredTickets.slice((ticketPage - 1) * PER_PAGE, ticketPage * PER_PAGE);
  const histTickets = myTickets.filter(t => t.status === 'used').slice().reverse();
  const pagedHist = histTickets.slice((histPage - 1) * 10, histPage * 10);

  const months = useMemo(
    () => chartMonths(primaryMonth, uniqueMonths(myTickets.map(t => t.month))),
    [primaryMonth, myTickets],
  );

  const handleTicketClick = (ticket: TicketType) => {
    setSelectedTicket(ticket);
    setMobileTicketDetail(true);
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    await downloadBatchTicketsPDF(activeTickets, state.orgName, state.orgLogo, `mes-tickets-${filterMonth}.pdf`);
    setDownloading(false);
  };

  const NAV = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'tickets', label: 'Mes Tickets', icon: Ticket },
    { id: 'history', label: 'Historique', icon: History },
  ] as const;

  const initials = user.name.split(' ').map(w => w[0]).join('');

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="w-56 shrink-0 flex flex-col bg-white border-r border-border h-full">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: '#0071E3', fontSize: 13, fontWeight: 700 }}>
            {initials}
          </div>
          <div className="min-w-0">
            <div style={{ fontSize: 13, fontWeight: 700 }} className="truncate">{user.name}</div>
            <div style={{ fontSize: 11, color: '#6E6E73' }} className="truncate">{agentInfo?.department ?? 'Agent'}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(n => (
          <button key={n.id} onClick={() => { setPage(n.id); setSelectedTicket(null); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
            style={{
              background: page === n.id ? '#EBF5FF' : 'transparent',
              color: page === n.id ? '#0071E3' : '#6E6E73',
              fontSize: 14, fontWeight: page === n.id ? 600 : 400,
            }}>
            <n.icon className="w-4 h-4 shrink-0" />{n.label}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-0.5">
        <button onClick={() => setShowPassword(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>
          <Lock className="w-4 h-4" /> Mot de passe
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </aside>
  );

  // ── Dashboard page ────────────────────────────────────────────────────────
  const DashboardPage = () => (
    <div className="p-6 lg:p-8 space-y-8 overflow-y-auto h-full">
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-0.5px' }}>
          Bonjour, {user.name.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 4 }}>{agentInfo?.department}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Disponibles', value: activeTickets.length, sub: 'tickets ce mois', color: '#0071E3', bg: 'linear-gradient(135deg, #EBF5FF, #F0F9FF)' },
          { label: 'Utilisés', value: usedTickets.length, sub: 'ce mois', color: '#34C759', bg: 'linear-gradient(135deg, #EDFBF1, #F0FDF4)' },
          { label: 'Subvention', value: `${usedTickets.reduce((s, t) => s + t.subsidy, 0).toFixed(0)} €`, sub: 'versée ce mois', color: '#FF9500', bg: 'linear-gradient(135deg, #FFF6EB, #FFFBF0)' },
          { label: 'Subvention', value: `${(monthTickets[0]?.subsidy ?? 0).toFixed(2)} €`, sub: 'par ticket', color: '#AF52DE', bg: 'linear-gradient(135deg, #F8F0FF, #FCF5FF)' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-5" style={{ background: kpi.bg, border: `1px solid ${kpi.color}18` }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: kpi.color, letterSpacing: '-0.5px' }}>{kpi.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginTop: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 2 }}>{kpi.sub}</div>
            <div className="mt-3 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(0,0,0,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${monthTickets.length ? (usedTickets.length / monthTickets.length) * 100 : 0}%`, background: kpi.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Recent active tickets */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Tickets disponibles ce mois</h2>
          <button onClick={() => setPage('tickets')} className="flex items-center gap-1 text-primary" style={{ fontSize: 14, fontWeight: 500 }}>
            Voir tout <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeTickets.slice(0, 8).map(t => (
            <TicketCard key={t.id} ticket={t} selected={selectedTicket?.id === t.id} orgLogo={state.orgLogo}
              onClick={() => { handleTicketClick(t); setPage('tickets'); }} />
          ))}
          {activeTickets.length === 0 && (
            <div className="col-span-4 py-10 rounded-2xl flex flex-col items-center gap-3" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Ticket className="w-8 h-8 text-muted-foreground" />
              <p style={{ fontSize: 14, color: '#6E6E73' }}>Aucun ticket disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Last used */}
      {usedTickets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Dernières utilisations</h2>
            <button onClick={() => setPage('history')} className="flex items-center gap-1 text-primary" style={{ fontSize: 14, fontWeight: 500 }}>
              Historique <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {usedTickets.slice(-5).reverse().map(t => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#EDFBF1' }}>
                  <CheckCircle className="w-5 h-5" style={{ color: '#34C759' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{t.providerName}</div>
                  <div style={{ fontSize: 12, color: '#6E6E73', fontFamily: 'monospace' }}>{t.number}</div>
                </div>
                <div className="text-right">
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#34C759' }}>{t.faceValue.toFixed(2)} €</div>
                  <div style={{ fontSize: 11, color: '#6E6E73' }}>
                    {t.usedAt ? new Date(t.usedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Tickets page ──────────────────────────────────────────────────────────
  const TicketsPage = () => (
    <div className="flex h-full overflow-hidden">
      {/* Left: grid */}
      <div className={`flex flex-col overflow-hidden transition-all duration-300 ${selectedTicket ? 'hidden lg:flex lg:w-1/2 xl:w-3/5' : 'flex-1'}`}>
        {/* Controls */}
        <div className="px-6 pt-6 pb-4 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Mes Tickets</h1>
            <button onClick={handleDownloadAll} disabled={downloading || activeTickets.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-primary disabled:opacity-40 transition-all hover:bg-primary/5"
              style={{ fontSize: 13, fontWeight: 600, color: '#0071E3' }}>
              <Download className="w-4 h-4" />{downloading ? '…' : `PDF (${activeTickets.length})`}
            </button>
          </div>

          {/* Month pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {months.map(m => (
              <button key={m} onClick={() => { setFilterMonth(m); setTicketPage(1); }}
                className="shrink-0 px-4 py-1.5 rounded-full transition-all"
                style={{ fontSize: 13, fontWeight: 500, background: filterMonth === m ? '#1D1D1F' : '#E8E8ED', color: filterMonth === m ? 'white' : '#6E6E73' }}>
                {new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {(['all', 'active', 'used'] as const).map(s => (
              <button key={s} onClick={() => { setFilterStatus(s); setTicketPage(1); }}
                className="px-3 py-1 rounded-full transition-all"
                style={{ fontSize: 12, fontWeight: 500, background: filterStatus === s ? '#0071E3' : '#F5F5F7', color: filterStatus === s ? 'white' : '#6E6E73' }}>
                {s === 'all' ? `Tous (${filteredTickets.length})` : s === 'active' ? `Actifs (${filteredTickets.filter(t => t.status === 'active').length})` : `Utilisés (${filteredTickets.filter(t => t.status === 'used').length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {pagedTickets.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 rounded-2xl" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
              <Ticket className="w-8 h-8 text-muted-foreground" />
              <p style={{ fontSize: 14, color: '#6E6E73' }}>Aucun ticket pour ce filtre</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {pagedTickets.map(t => (
                <TicketCard key={t.id} ticket={t} selected={selectedTicket?.id === t.id} orgLogo={state.orgLogo} onClick={() => handleTicketClick(t)} />
              ))}
            </div>
          )}
          <Pagination page={ticketPage} total={filteredTickets.length} perPage={PER_PAGE} onChange={setTicketPage} />
        </div>
      </div>

      {/* Right: detail panel (desktop) */}
      {selectedTicket && (
        <div className="hidden lg:flex flex-col flex-1 border-l border-border overflow-hidden" style={{ background: '#F5F5F7' }}>
          <TicketDetail
            ticket={selectedTicket}
            orgName={state.orgName}
            orgLogo={state.orgLogo}
            onClose={() => setSelectedTicket(null)}
          />
        </div>
      )}

      {/* Mobile full-screen detail */}
      {selectedTicket && mobileTicketDetail && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-y-auto" style={{ background: '#F5F5F7' }}>
          <TicketDetail
            ticket={selectedTicket}
            orgName={state.orgName}
            orgLogo={state.orgLogo}
            onBack={() => { setMobileTicketDetail(false); }}
          />
        </div>
      )}
    </div>
  );

  // ── History page ──────────────────────────────────────────────────────────
  const HistoryPage = () => (
    <div className="p-6 lg:p-8 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Historique</h1>
        <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 2 }}>{histTickets.length} tickets utilisés au total</p>
      </div>

      {/* Summary by month */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {months.map(m => {
          const mTickets = myTickets.filter(t => t.month === m && t.status === 'used');
          const mTotal = mTickets.reduce((s, t) => s + t.faceValue, 0);
          return (
            <div key={m} className="rounded-2xl p-4 bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 12, color: '#6E6E73', fontWeight: 500 }}>
                {new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', marginTop: 4 }}>{mTickets.length}</div>
              <div style={{ fontSize: 12, color: '#34C759', fontWeight: 600, marginTop: 2 }}>{mTotal.toFixed(2)} €</div>
            </div>
          );
        })}
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {pagedHist.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 rounded-2xl bg-white" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <History className="w-8 h-8 text-muted-foreground" />
            <p style={{ fontSize: 14, color: '#6E6E73' }}>Aucun historique disponible</p>
          </div>
        ) : pagedHist.map(t => (
          <div key={t.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white hover:shadow-sm transition-all cursor-pointer"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}
            onClick={() => { setSelectedTicket(t); setPage('tickets'); setMobileTicketDetail(true); }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#EDFBF1' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#34C759' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.providerName}</span>
              </div>
              <div style={{ fontSize: 12, color: '#6E6E73', fontFamily: 'monospace', marginTop: 1 }}>{t.number}</div>
              <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 1 }}>
                {t.usedAt ? new Date(t.usedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>{t.faceValue.toFixed(2)} €</div>
              <div style={{ fontSize: 11, color: '#34C759', fontWeight: 600 }}>Sub: {t.subsidy.toFixed(2)} €</div>
              <div style={{ fontSize: 11, color: '#AEAEB2', marginTop: 1 }}>
                {new Date(t.month + '-15').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        ))}
      </div>
      <Pagination page={histPage} total={histTickets.length} perPage={10} onChange={setHistPage} />
    </div>
  );

  const pageContent = { dashboard: <DashboardPage />, tickets: <TicketsPage />, history: <HistoryPage /> }[page];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 h-full shadow-2xl">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-border px-4 h-14 flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent">
            <Menu className="w-5 h-5" />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{NAV.find(n => n.id === page)?.label}</span>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden" style={{ background: page === 'tickets' ? '#F5F5F7' : '#F5F5F7' }}>
          {pageContent}
        </div>
      </div>

      {showPassword && (
        <ChangePasswordModal
          mustChange={user.mustChangePassword}
          onDone={() => { setShowPassword(false); user.mustChangePassword = false; }}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}
