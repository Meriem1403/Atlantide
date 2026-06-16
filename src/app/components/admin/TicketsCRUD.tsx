import { useState, useMemo, useEffect } from 'react';
import { Plus, Download, Trash2, Search, ChevronLeft, Eye, CheckSquare, Square, Users, FolderArchive } from 'lucide-react';
import { OrgLogo } from '../shared/OrgLogo';
import { Ticket, Agent, SubventionConfig, AgentMonthlyPlan } from '../../types';
import { TicketGenerationItem } from '../../api';
import { Pagination } from '../shared/Pagination';
import { AdminRoute } from './AdminApp';
import { downloadTicketPDF, downloadBatchTicketsPDF, downloadTicketsZipByService, ServiceTicketGroup } from '../shared/pdfUtils';
import { TicketVisual } from '../shared/TicketVisual';
import { AdminFormLayout } from '../shared/AdminFormLayout';
import { FilterSelect, MonthInput } from '../shared/FilterSelect';

const PER_PAGE = 12;

interface Props {
  route: string;
  navigate: (r: AdminRoute) => void;
  tickets: Ticket[];
  agents: Agent[];
  subventions: SubventionConfig[];
  monthlyPlans?: AgentMonthlyPlan[];
  orgName: string;
  orgLogo: string;
  onGenerateBatch: (month: string, items: TicketGenerationItem[]) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = { active: 'Actif', used: 'Utilisé', expired: 'Expiré', cancelled: 'Annulé' };
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  active: { bg: '#EEF2FF', text: '#4361EE' },
  used: { bg: '#DCFCE7', text: '#16A34A' },
  expired: { bg: '#FEF3C7', text: '#D97706' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

function PageHeader({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
  return (
    <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 mb-3" style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
          <ChevronLeft className="w-4 h-4" /> Retour aux tickets
        </button>
      )}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

interface AgentRow {
  agent: Agent;
  plan?: AgentMonthlyPlan;
  service: string;
  count: number;
  faceValue: number;
  subsidy: number;
  existingTickets: number;
}

function buildAgentRows(
  agents: Agent[],
  monthlyPlans: AgentMonthlyPlan[],
  subventions: SubventionConfig[],
  tickets: Ticket[],
  month: string,
): AgentRow[] {
  const global = subventions.find(sv => sv.active && sv.appliesTo === 'all');
  const plansByAgent = new Map(
    monthlyPlans.filter(p => p.month === month).map(p => [p.agentId, p]),
  );

  return agents
    .filter(a => a.active)
    .map(agent => {
      const plan = plansByAgent.get(agent.id);
      return {
        agent,
        plan,
        service: plan?.serviceName ?? agent.department,
        count: plan?.ticketCount ?? global?.ticketsPerMonth ?? 23,
        faceValue: plan?.faceValue ?? global?.faceValue ?? 5.24,
        subsidy: plan?.subsidy ?? global?.subsidy ?? 3.14,
        existingTickets: tickets.filter(t => t.agentId === agent.id && t.month === month && t.status !== 'cancelled').length,
      };
    })
    .sort((a, b) => a.service.localeCompare(b.service, 'fr') || a.agent.name.localeCompare(b.agent.name, 'fr'));
}

function buildAgentServiceMap(
  agents: Agent[],
  monthlyPlans: AgentMonthlyPlan[],
  month: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const agent of agents) {
    const plan = monthlyPlans.find(p => p.agentId === agent.id && p.month === month);
    map.set(agent.id, plan?.serviceName ?? agent.department ?? 'Sans service');
  }
  return map;
}

function groupTicketsByService(
  tickets: Ticket[],
  agentServiceMap: Map<string, string>,
  month: string,
  statusFilter: string,
  selectedServices: Set<string>,
): ServiceTicketGroup[] {
  const byService = new Map<string, Ticket[]>();

  for (const ticket of tickets) {
    if (ticket.month !== month) continue;
    if (statusFilter !== 'all' && ticket.status !== statusFilter) continue;
    const serviceName = agentServiceMap.get(ticket.agentId) ?? 'Sans service';
    if (!selectedServices.has(serviceName)) continue;
    if (!byService.has(serviceName)) byService.set(serviceName, []);
    byService.get(serviceName)!.push(ticket);
  }

  return [...byService.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
    .map(([serviceName, serviceTickets]) => ({
      serviceName,
      tickets: serviceTickets.sort((a, b) => a.agentName.localeCompare(b.agentName, 'fr') || a.number.localeCompare(b.number, 'fr')),
    }));
}

// ── Export by service page ────────────────────────────────────────────────────
function ExportByServicePage({
  tickets, agents, monthlyPlans = [], orgName, orgLogo, navigate,
}: {
  tickets: Ticket[];
  agents: Agent[];
  monthlyPlans?: AgentMonthlyPlan[];
  orgName: string;
  orgLogo: string;
  navigate: (r: AdminRoute) => void;
}) {
  const months = useMemo(
    () => [...new Set([...monthlyPlans.map(p => p.month), ...tickets.map(t => t.month)])].sort().reverse(),
    [monthlyPlans, tickets],
  );
  const [month, setMonth] = useState(months[0] ?? '2026-07');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'used'>('active');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState('');

  const agentServiceMap = useMemo(
    () => buildAgentServiceMap(agents, monthlyPlans, month),
    [agents, monthlyPlans, month],
  );

  const serviceRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ticket of tickets) {
      if (ticket.month !== month) continue;
      if (statusFilter !== 'all' && ticket.status !== statusFilter) continue;
      const serviceName = agentServiceMap.get(ticket.agentId) ?? 'Sans service';
      counts.set(serviceName, (counts.get(serviceName) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
      .map(([serviceName, count]) => ({ serviceName, count }));
  }, [tickets, agentServiceMap, month, statusFilter]);

  useEffect(() => {
    setSelectedServices(new Set(serviceRows.map(r => r.serviceName)));
  }, [serviceRows]);

  const selectedCount = useMemo(() => {
    return groupTicketsByService(tickets, agentServiceMap, month, statusFilter, selectedServices)
      .reduce((sum, g) => sum + g.tickets.length, 0);
  }, [tickets, agentServiceMap, month, statusFilter, selectedServices]);

  const toggleService = (serviceName: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceName)) next.delete(serviceName);
      else next.add(serviceName);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedServices.size === serviceRows.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(serviceRows.map(r => r.serviceName)));
    }
  };

  const handleDownload = async () => {
    const groups = groupTicketsByService(tickets, agentServiceMap, month, statusFilter, selectedServices);
    if (groups.length === 0) return;

    setDownloading(true);
    setProgress('Préparation…');
    try {
      await downloadTicketsZipByService(
        groups,
        orgName,
        orgLogo,
        `tickets-${month}-par-service.zip`,
        (done, total, serviceName) => {
          if (serviceName) {
            setProgress(`Service ${done + 1}/${total} : ${serviceName}`);
          }
        },
      );
      setProgress('');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <PageHeader
        title="Export par service"
        sub="Téléchargez un ZIP avec un dossier par service contenant les PDF des tickets"
        onBack={() => navigate('tickets')}
      />

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Mois</label>
            <MonthInput value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Statut des tickets</label>
            <FilterSelect variant="form" value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'active' | 'all' | 'used')}>
              <option value="active">Actifs uniquement</option>
              <option value="all">Tous les statuts</option>
              <option value="used">Utilisés uniquement</option>
            </FilterSelect>
          </div>
          <div className="bg-white rounded-2xl p-5 flex flex-col justify-between" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Résumé</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#4361EE', marginTop: 8 }}>{selectedCount}</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>tickets · {selectedServices.size} service(s)</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Services</h3>
            <button onClick={toggleAll} className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600, color: '#4361EE' }}>
              {selectedServices.size === serviceRows.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {selectedServices.size === serviceRows.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          </div>

          {serviceRows.length === 0 ? (
            <div className="py-14 text-center" style={{ fontSize: 14, color: '#6B7280' }}>
              Aucun ticket pour ce mois et ce filtre.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {serviceRows.map(row => {
                const checked = selectedServices.has(row.serviceName);
                return (
                  <button
                    key={row.serviceName}
                    type="button"
                    onClick={() => toggleService(row.serviceName)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#F9FAFB] transition-colors"
                  >
                    {checked
                      ? <CheckSquare className="w-5 h-5 shrink-0" style={{ color: '#4361EE' }} />
                      : <Square className="w-5 h-5 shrink-0 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FolderArchive className="w-4 h-4 shrink-0" style={{ color: '#6B7280' }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }} className="truncate">{row.serviceName}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                        Dossier : {row.serviceName}/
                      </div>
                    </div>
                    <span className="shrink-0 px-3 py-1 rounded-full" style={{ fontSize: 12, fontWeight: 700, background: '#EEF2FF', color: '#4361EE' }}>
                      {row.count} ticket{row.count > 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Contenu du ZIP</h4>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
            Chaque service aura son propre dossier (nom du service). À l&apos;intérieur :
            un PDF regroupé <code style={{ fontSize: 12 }}>tickets.pdf</code> et un PDF par ticket
            nommé <code style={{ fontSize: 12 }}>Agent - TR-….pdf</code>.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading || selectedCount === 0}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: '#4361EE', color: 'white', fontSize: 15, fontWeight: 700 }}
        >
          <Download className="w-5 h-5" />
          {downloading ? (progress || 'Génération du ZIP…') : `Télécharger le ZIP (${selectedCount} tickets)`}
        </button>
      </div>
    </div>
  );
}

// ── Generate page ─────────────────────────────────────────────────────────────
function GeneratePage({
  agents, subventions, monthlyPlans = [], tickets, onGenerateBatch, navigate,
}: {
  agents: Agent[];
  subventions: SubventionConfig[];
  monthlyPlans?: AgentMonthlyPlan[];
  tickets: Ticket[];
  onGenerateBatch: Props['onGenerateBatch'];
  navigate: (r: AdminRoute) => void;
}) {
  const defaultMonth = monthlyPlans[0]?.month ?? '2026-07';
  const [month, setMonth] = useState(defaultMonth);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ agentCount: number; totalTickets: number } | null>(null);

  const allRows = useMemo(
    () => buildAgentRows(agents, monthlyPlans, subventions, tickets, month),
    [agents, monthlyPlans, subventions, tickets, month],
  );

  const services = useMemo(
    () => [...new Set(allRows.map(r => r.service))].sort((a, b) => a.localeCompare(b, 'fr')),
    [allRows],
  );

  const visibleRows = useMemo(
    () => serviceFilter === 'all' ? allRows : allRows.filter(r => r.service === serviceFilter),
    [allRows, serviceFilter],
  );

  const selectableRows = visibleRows.filter(r => r.count > 0);
  const allVisibleSelected = selectableRows.length > 0 && selectableRows.every(r => selectedIds.has(r.agent.id));

  const toggleAgent = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => setSelectedIds(new Set(selectableRows.map(r => r.agent.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const selectedRows = allRows.filter(r => selectedIds.has(r.agent.id) && r.count > 0);
  const totalTickets = selectedRows.reduce((s, r) => s + r.count, 0);
  const totalSubsidy = selectedRows.reduce((s, r) => s + r.subsidy * r.count, 0);

  const handleGenerate = async () => {
    if (!selectedRows.length) return;
    setGenerating(true);
    try {
      const items: TicketGenerationItem[] = selectedRows.map(r => ({
        agentId: r.agent.id,
        count: r.count,
        faceValue: r.faceValue,
        subsidy: r.subsidy,
      }));
      const res = await onGenerateBatch(month, items);
      setResult({ agentCount: res.agentCount, totalTickets: res.totalTickets });
      setSelectedIds(new Set());
      setTimeout(() => { setResult(null); navigate('tickets'); }, 2000);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <PageHeader
        title="Générer des tickets"
        sub="Sélectionnez un ou plusieurs agents, par service ou individuellement"
        onBack={() => navigate('tickets')}
      />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-5">

          {result && (
            <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>Génération terminée</div>
                <div style={{ fontSize: 13, color: '#15803D' }}>
                  {result.totalTickets} tickets pour {result.agentCount} agent{result.agentCount > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 flex flex-col sm:flex-row gap-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <div className="flex-1">
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>Mois de validité</label>
              <MonthInput value={month} onChange={e => { setMonth(e.target.value); setSelectedIds(new Set()); }} />
            </div>
            <div className="flex-1">
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>Service</label>
              <FilterSelect variant="form" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}>
                <option value="all">Tous les services ({allRows.length})</option>
                {services.map(s => (
                  <option key={s} value={s}>{s} ({allRows.filter(r => r.service === s).length})</option>
                ))}
              </FilterSelect>
            </div>
          </div>

          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {visibleRows.length} agent{visibleRows.length > 1 ? 's' : ''}
                  {serviceFilter !== 'all' ? ` · ${serviceFilter}` : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAllVisible}
                  className="px-3 py-1.5 rounded-lg border border-border hover:border-primary transition-all"
                  style={{ fontSize: 12, fontWeight: 500, color: '#4361EE' }}>
                  Tout sélectionner
                </button>
                <button type="button" onClick={clearSelection}
                  className="px-3 py-1.5 rounded-lg border border-border transition-all"
                  style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="divide-y divide-border max-h-[min(52vh,520px)] overflow-y-auto">
              <button
                type="button"
                onClick={() => allVisibleSelected ? clearSelection() : selectAllVisible()}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/40 transition-colors"
              >
                {allVisibleSelected
                  ? <CheckSquare className="w-4 h-4 shrink-0" style={{ color: '#4361EE' }} />
                  : <Square className="w-4 h-4 shrink-0 text-muted-foreground" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Sélectionner tout ({selectableRows.length})</span>
              </button>

              {visibleRows.map(row => {
                const selected = selectedIds.has(row.agent.id);
                const disabled = row.count === 0;
                return (
                  <button
                    key={row.agent.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && toggleAgent(row.agent.id)}
                    className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors disabled:opacity-40"
                    style={{ background: selected ? '#EEF2FF' : 'transparent' }}
                  >
                    {selected
                      ? <CheckSquare className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#4361EE' }} />
                      : <Square className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{row.agent.name}</span>
                        <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: '#F3F4F6', color: '#6B7280' }}>
                          {row.service}
                        </span>
                        {row.existingTickets > 0 && (
                          <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: '#FEF3C7', color: '#D97706' }}>
                            {row.existingTickets} déjà généré{row.existingTickets > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                        {row.count} tickets · {row.faceValue.toFixed(2)} € (subv. {row.subsidy.toFixed(2)} €)
                        {row.plan?.numerotation ? ` · N° ${row.plan.numerotation}` : ''}
                        {row.plan?.notes ? ` · ${row.plan.notes}` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRows.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Agents sélectionnés', value: String(selectedRows.length), color: '#4361EE', bg: '#EEF2FF' },
                { label: 'Tickets à générer', value: String(totalTickets), color: '#2DC653', bg: '#DCFCE7' },
                { label: 'Coût employeur', value: `${totalSubsidy.toFixed(2)} €`, color: '#374151', bg: '#F9FAFB' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: item.bg }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pb-4">
            <button onClick={() => navigate('tickets')} className="px-5 py-2.5 rounded-xl border border-border bg-white" style={{ fontSize: 14, fontWeight: 500 }}>
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedRows.length || generating || !!result}
              className="flex items-center gap-2 px-6 py-3 rounded-xl disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#4361EE', color: 'white', fontSize: 15, fontWeight: 700 }}
            >
              <Plus className="w-4 h-4" />
              {generating ? 'Génération…' : `Générer ${totalTickets || 0} ticket${totalTickets !== 1 ? 's' : ''} pour ${selectedRows.length || 0} agent${selectedRows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View page ─────────────────────────────────────────────────────────────────
function ViewPage({ ticket, orgName, orgLogo, navigate }: { ticket: Ticket; orgName: string; orgLogo: string; navigate: (r: AdminRoute) => void }) {
  const [downloading, setDownloading] = useState(false);
  const sc = STATUS_COLOR[ticket.status] ?? { bg: '#F3F4F6', text: '#6B7280' };

  return (
    <AdminFormLayout title="Détail du ticket" backLabel="Retour aux tickets" onBack={() => navigate('tickets')} maxWidth="5xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <TicketVisual ticket={ticket} orgName={orgName} orgLogo={orgLogo} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Informations</h3>
              <span className="px-3 py-1 rounded-full" style={{ fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text }}>
                {STATUS_LABEL[ticket.status]}
              </span>
            </div>
            <div className="space-y-0">
              {[
                ['Numéro', ticket.number, true],
                ['Agent', ticket.agentName, false],
                ['Mois', new Date(ticket.month + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), false],
                ['Valeur faciale', `${ticket.faceValue.toFixed(2)} €`, false],
                ['Généré le', new Date(ticket.generatedAt).toLocaleString('fr-FR'), false],
                ...(ticket.usedAt ? [['Utilisé le', new Date(ticket.usedAt).toLocaleString('fr-FR'), false]] : []),
                ...(ticket.providerName ? [['Prestataire', ticket.providerName, false]] : []),
              ].map(([k, v, mono]) => (
                <div key={String(k)} className="flex justify-between gap-4 py-3 border-b border-border last:border-0">
                  <span style={{ fontSize: 13, color: '#6B7280', shrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={async () => { setDownloading(true); await downloadTicketPDF(ticket, orgName, orgLogo); setDownloading(false); }}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#4361EE', color: 'white', fontSize: 15, fontWeight: 600 }}
          >
            <Download className="w-5 h-5" /> {downloading ? 'Génération…' : 'Télécharger en PDF'}
          </button>
        </div>
      </div>
    </AdminFormLayout>
  );
}

// ── List page ─────────────────────────────────────────────────────────────────
export function TicketsCRUD({ route, navigate, tickets, agents, subventions, monthlyPlans = [], orgName, orgLogo, onGenerateBatch, onCancel, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterMonth, setFilterMonth] = useState(monthlyPlans[0]?.month ?? '2026-07');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ ticket: Ticket; action: 'cancel' | 'delete' } | null>(null);

  const agentServiceMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents) {
      const plan = monthlyPlans.find(p => p.agentId === a.id && (!filterMonth || p.month === filterMonth));
      map.set(a.id, plan?.serviceName ?? a.department);
    }
    return map;
  }, [agents, monthlyPlans, filterMonth]);

  const services = useMemo(
    () => [...new Set([...agentServiceMap.values()].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [agentServiceMap],
  );

  const filteredAgents = useMemo(() => {
    const list = filterService === 'all'
      ? agents
      : agents.filter(a => agentServiceMap.get(a.id) === filterService);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [agents, agentServiceMap, filterService]);

  useEffect(() => {
    if (filterAgent === 'all') return;
    if (filterService !== 'all' && agentServiceMap.get(filterAgent) !== filterService) {
      setFilterAgent('all');
    }
  }, [filterService, filterAgent, agentServiceMap]);

  const handleServiceFilterChange = (value: string) => {
    setFilterService(value);
    if (filterAgent !== 'all') {
      const svc = agentServiceMap.get(filterAgent);
      if (value !== 'all' && svc !== value) setFilterAgent('all');
    }
    setPage(1);
  };

  if (route === 'tickets/export') return (
    <ExportByServicePage
      tickets={tickets}
      agents={agents}
      monthlyPlans={monthlyPlans}
      orgName={orgName}
      orgLogo={orgLogo}
      navigate={navigate}
    />
  );

  if (route === 'tickets/generate') return (
    <GeneratePage agents={agents} subventions={subventions} monthlyPlans={monthlyPlans} tickets={tickets}
      onGenerateBatch={onGenerateBatch} navigate={navigate} />
  );

  if (route.startsWith('tickets/view/')) {
    const id = route.replace('tickets/view/', '');
    const t = tickets.find(x => x.id === id);
    if (!t) { navigate('tickets'); return null; }
    return <ViewPage ticket={t} orgName={orgName} orgLogo={orgLogo} navigate={navigate} />;
  }

  const months = [...new Set([...monthlyPlans.map(p => p.month), ...tickets.map(t => t.month)])].sort().reverse();

  const filtered = tickets.filter(t => {
    const ms = !search || t.number.toLowerCase().includes(search.toLowerCase()) || t.agentName.toLowerCase().includes(search.toLowerCase());
    const msv = filterService === 'all' || agentServiceMap.get(t.agentId) === filterService;
    const ma = filterAgent === 'all' || t.agentId === filterAgent;
    const mm = !filterMonth || t.month === filterMonth;
    const mst = filterStatus === 'all' || t.status === filterStatus;
    return ms && msv && ma && mm && mst;
  });
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDownloadAll = async () => {
    setDownloading(true);
    await downloadBatchTicketsPDF(filtered, orgName, orgLogo, `tickets-${filterMonth || 'tous'}.pdf`);
    setDownloading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>Tickets</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>
              {filtered.length === tickets.length
                ? `${tickets.length} tickets au total`
                : `${filtered.length} sur ${tickets.length} tickets`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('tickets/export')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-white hover:border-primary transition-all"
              style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
              <FolderArchive className="w-4 h-4" /> Export par service
            </button>
            <button onClick={handleDownloadAll} disabled={downloading || filtered.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-white hover:border-primary transition-all disabled:opacity-40"
              style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
              <Download className="w-4 h-4" />{downloading ? '…' : `PDF (${filtered.length})`}
            </button>
            <button onClick={() => navigate('tickets/generate')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:opacity-90"
              style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
              <Plus className="w-4 h-4" /> Générer
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="N° ou nom…"
              className="w-full rounded-xl border border-border pl-9 pr-3 py-2.5 outline-none focus:border-primary"
              style={{ background: 'white', fontSize: 14 }} />
          </div>
          <FilterSelect value={filterService} onChange={e => handleServiceFilterChange(e.target.value)}>
            <option value="all">Tous les services</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </FilterSelect>
          <FilterSelect value={filterAgent} onChange={e => { setFilterAgent(e.target.value); setPage(1); }}>
            <option value="all">Tous les agents</option>
            {filteredAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </FilterSelect>
          <FilterSelect value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}>
            <option value="">Tous les mois</option>
            {months.map(m => <option key={m} value={m}>{new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</option>)}
          </FilterSelect>
          <FilterSelect value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </FilterSelect>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {paged.length === 0 ? (
            <div className="col-span-4 py-16 bg-white rounded-2xl text-center" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
              <p style={{ fontSize: 14, color: '#6B7280' }}>Aucun ticket trouvé</p>
            </div>
          ) : paged.map(t => {
            const sc = STATUS_COLOR[t.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
            return (
              <div key={t.id} className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-md"
                style={{ border: '1px solid rgba(17,24,39,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="px-4 py-3 relative overflow-hidden"
                  style={{ background: t.status === 'active' ? 'linear-gradient(135deg, #4361EE, #6B8EFF)' : 'linear-gradient(135deg, #64748B, #94A3B8)', minHeight: 76 }}>
                  <div className="flex justify-between items-start mb-1">
                    <OrgLogo src={orgLogo} size={28} onDark />
                    <span className="px-2 py-0.5 rounded-full text-white" style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.2)' }}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>{t.faceValue.toFixed(2)} €</div>
                  <div className="absolute -right-3 -bottom-3 w-12 h-12 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div className="p-3">
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6B7280', marginBottom: 2 }}>{t.number}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{t.agentName}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(t.month + '-15').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</div>
                  <div className="flex gap-1 mt-2.5">
                    <button onClick={() => navigate(`tickets/view/${t.id}` as AdminRoute)}
                      className="flex-1 py-1.5 rounded-lg border border-border flex items-center justify-center gap-1 hover:border-primary hover:text-primary transition-all"
                      style={{ fontSize: 11, fontWeight: 500 }}>
                      <Eye className="w-3 h-3" /> Voir
                    </button>
                    {t.status === 'active' && (
                      <button onClick={() => setConfirmAction({ ticket: t, action: 'cancel' })}
                        className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Annuler ce ticket ?</h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>
              Ticket <strong className="font-mono">{confirmAction.ticket.number}</strong>
            </p>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 rounded-xl border border-border" style={{ fontSize: 14 }}>Retour</button>
              <button onClick={() => { onCancel(confirmAction.ticket.id); setConfirmAction(null); }}
                className="flex-1 py-2.5 rounded-xl" style={{ background: '#E63946', color: 'white', fontSize: 14, fontWeight: 600 }}>
                Annuler le ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
