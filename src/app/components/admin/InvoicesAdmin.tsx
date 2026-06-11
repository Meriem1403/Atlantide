import { useState } from 'react';
import { ProviderInvoice, Provider } from '../../types';
import { Pagination } from '../shared/Pagination';
import { AdminRoute } from './AdminApp';
import { FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { AdminFormLayout } from '../shared/AdminFormLayout';
import { FilterSelect } from '../shared/FilterSelect';

const PER_PAGE = 8;

interface Props {
  route: string;
  navigate: (r: AdminRoute) => void;
  invoices: ProviderInvoice[];
  providers: Provider[];
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
}

const STATUS = {
  submitted: { label: 'En attente', bg: '#FEF3C7', text: '#D97706' },
  approved: { label: 'Approuvée', bg: '#DCFCE7', text: '#16A34A' },
  rejected: { label: 'Rejetée', bg: '#FEE2E2', text: '#DC2626' },
};

function DetailPage({ invoice, onApprove, onReject, navigate }: { invoice: ProviderInvoice; onApprove: Props['onApprove']; onReject: Props['onReject']; navigate: (r: AdminRoute) => void }) {
  const [note, setNote] = useState(invoice.reviewNote ?? '');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const st = STATUS[invoice.status];

  const handleAction = () => {
    if (!action) return;
    if (action === 'approve') onApprove(invoice.id, note);
    else onReject(invoice.id, note);
    navigate('invoices');
  };

  return (
    <AdminFormLayout
      title={`Facture ${invoice.invoiceNumber}`}
      subtitle={invoice.providerName}
      backLabel="Retour aux factures"
      onBack={() => navigate('invoices')}
      maxWidth="5xl"
    >
      <div className="flex items-center gap-3 mb-6">
        <span className="px-3 py-1 rounded-full" style={{ fontSize: 12, fontWeight: 600, background: st.bg, color: st.text }}>{st.label}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Tickets validés', value: invoice.ticketCount.toString(), color: '#4361EE', bg: '#EEF2FF' },
              { label: 'Subventions', value: `${invoice.subsidyAmount.toFixed(2)} €`, color: '#2DC653', bg: '#DCFCE7' },
              { label: 'Total facture', value: `${invoice.totalAmount.toFixed(2)} €`, color: '#D97706', bg: '#FEF3C7' },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4 text-center" style={{ background: item.bg, border: `1px solid ${item.color}20` }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Informations</h3>
            {[
              ['Prestataire', invoice.providerName],
              ['Mois', new Date(invoice.month + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })],
              ['N° Facture', invoice.invoiceNumber],
              ['Soumise le', new Date(invoice.submittedAt).toLocaleDateString('fr-FR')],
              ...(invoice.reviewedAt ? [['Traitée le', new Date(invoice.reviewedAt).toLocaleDateString('fr-FR')]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5 border-b border-border last:border-0">
                <span style={{ fontSize: 13, color: '#6B7280' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#6B7280' }}>Notes du prestataire</h3>
              <p style={{ fontSize: 14, color: '#374151' }}>{invoice.notes}</p>
            </div>
          )}

          {/* File */}
          {invoice.fileName && (
            <div className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FEF3C7' }}>
                <FileText className="w-6 h-6" style={{ color: '#D97706' }} />
              </div>
              <div className="flex-1">
                <div style={{ fontSize: 14, fontWeight: 600 }}>{invoice.fileName}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>Fichier joint</div>
              </div>
              {invoice.fileData && (
                <a href={invoice.fileData} download={invoice.fileName}>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:border-primary transition-all" style={{ fontSize: 13, color: '#4361EE' }}>
                    <Download className="w-4 h-4" /> Télécharger
                  </button>
                </a>
              )}
            </div>
          )}

          {/* Review note */}
          {invoice.reviewNote && (
            <div className="p-4 rounded-2xl" style={{ background: invoice.status === 'approved' ? '#DCFCE7' : '#FEE2E2' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: invoice.status === 'approved' ? '#16A34A' : '#DC2626' }}>
                Note de révision : {invoice.reviewNote}
              </p>
            </div>
          )}

        </div>

        {invoice.status === 'submitted' && (
          <div className="bg-white rounded-2xl p-6 space-y-4 h-fit sticky top-0" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Traiter cette facture</h3>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>Note (optionnelle)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
                placeholder="Motif ou commentaire…"
                className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary resize-none"
                style={{ background: '#F9FAFB', fontSize: 14 }} />
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setAction('approve'); handleAction(); }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:opacity-90"
                style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
                <CheckCircle className="w-4 h-4" /> Approuver
              </button>
              <button onClick={() => { setAction('reject'); handleAction(); }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl transition-all hover:opacity-90"
                style={{ background: '#FEE2E2', color: '#DC2626', fontSize: 14, fontWeight: 600 }}>
                <XCircle className="w-4 h-4" /> Rejeter
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminFormLayout>
  );
}

export function InvoicesAdmin({ route, navigate, invoices, providers, onApprove, onReject }: Props) {
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);

  if (route.startsWith('invoices/view/')) {
    const id = route.replace('invoices/view/', '');
    const inv = invoices.find(i => i.id === id);
    if (!inv) { navigate('invoices'); return null; }
    return <DetailPage invoice={inv} onApprove={onApprove} onReject={onReject} navigate={navigate} />;
  }

  const filtered = invoices.filter(i =>
    (filterProvider === 'all' || i.providerId === filterProvider) &&
    (filterStatus === 'all' || i.status === filterStatus)
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>Factures prestataires</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{invoices.length} facture(s) reçue(s)</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <FilterSelect value={filterProvider} onChange={e => { setFilterProvider(e.target.value); setPage(1); }}>
            <option value="all">Tous les prestataires</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </FilterSelect>
          <FilterSelect value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="all">Tous les statuts</option>
            <option value="submitted">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Rejetées</option>
          </FilterSelect>
        </div>

        <div className="space-y-3">
          {paged.length === 0 ? (
            <div className="py-16 bg-white rounded-2xl flex flex-col items-center gap-4" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
              <FileText className="w-10 h-10 text-muted-foreground" />
              <p style={{ fontSize: 14, color: '#6B7280' }}>Aucune facture reçue</p>
            </div>
          ) : paged.map(inv => {
            const st = STATUS[inv.status];
            return (
              <div key={inv.id} className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-md" style={{ border: '1px solid rgba(17,24,39,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FEF3C7' }}>
                    <FileText className="w-6 h-6" style={{ color: '#D97706' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{inv.providerName}</span>
                      <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: st.bg, color: st.text }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {new Date(inv.month + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} · N° {inv.invoiceNumber}
                    </div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                      Soumise le {new Date(inv.submittedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#D97706' }}>{inv.totalAmount.toFixed(2)} €</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{inv.ticketCount} tickets</div>
                  </div>
                  <button onClick={() => navigate(`invoices/view/${inv.id}` as AdminRoute)}
                    className="ml-2 px-4 py-2.5 rounded-xl border border-border hover:border-primary hover:text-primary transition-all"
                    style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Voir détail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>
    </div>
  );
}
