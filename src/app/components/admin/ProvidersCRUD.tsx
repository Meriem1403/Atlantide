import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, ChevronLeft, Store, Save } from 'lucide-react';
import { Provider } from '../../types';
import { Pagination } from '../shared/Pagination';
import { AdminRoute } from './AdminApp';
import { AdminFormLayout } from '../shared/AdminFormLayout';

const PER_PAGE = 9;

interface Props {
  route: string;
  navigate: (r: AdminRoute) => void;
  providers: Provider[];
  onCreate: (p: Omit<Provider, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, p: Partial<Provider>) => void;
  onDelete: (id: string) => void;
}

const blank = (): Omit<Provider, 'id' | 'createdAt'> => ({
  name: '', address: '', siret: '', email: '', phone: '', active: true,
});

function PageHeader({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
  return (
    <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 mb-3" style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
          <ChevronLeft className="w-4 h-4" /> Retour aux prestataires
        </button>
      )}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function ProviderForm({
  title, initial, onSubmit, navigate,
}: { title: string; initial: Omit<Provider, 'id' | 'createdAt'>; onSubmit: (f: Omit<Provider, 'id' | 'createdAt'>) => void; navigate: (r: AdminRoute) => void; }) {
  const [form, setForm] = useState(initial);
  const f = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));
  const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...p} className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary transition-colors"
      style={{ background: '#F9FAFB', fontSize: 14, color: '#111827', ...p.style }} />
  );
  const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>
        {label}{req && <span style={{ color: '#E63946' }}> *</span>}
      </label>
      {children}
    </div>
  );
  return (
    <AdminFormLayout title={title} backLabel="Retour aux prestataires" onBack={() => navigate('providers')} maxWidth="4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 lg:p-8 space-y-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <Field label="Nom du restaurant" req><Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="La Bonne Fourchette" /></Field>
          <Field label="Adresse complète" req><Input value={form.address} onChange={e => f('address', e.target.value)} placeholder="12 rue du Commerce, 75015 Paris" /></Field>
          <Field label="Numéro SIRET" req><Input value={form.siret} onChange={e => f('siret', e.target.value)} placeholder="123 456 789 00012" /></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email"><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="contact@resto.fr" /></Field>
            <Field label="Téléphone"><Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="01 23 45 67 89" /></Field>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <Field label="Statut">
              <div className="flex gap-3">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => f('active', v)} className="flex-1 py-2.5 rounded-xl border-2 transition-all"
                    style={{ borderColor: form.active === v ? '#4361EE' : 'rgba(17,24,39,0.09)', background: form.active === v ? '#EEF2FF' : 'white', color: form.active === v ? '#4361EE' : '#6B7280', fontSize: 14, fontWeight: form.active === v ? 600 : 400 }}>
                    {v ? 'Actif' : 'Inactif'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => { onSubmit(form); navigate('providers'); }} disabled={!form.name || !form.siret}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
              <Save className="w-4 h-4" /> Enregistrer
            </button>
            <button onClick={() => navigate('providers')} className="px-5 py-3 rounded-xl border border-border bg-white" style={{ fontSize: 14, fontWeight: 500 }}>Annuler</button>
          </div>
        </div>
      </div>
    </AdminFormLayout>
  );
}

export function ProvidersCRUD({ route, navigate, providers, onCreate, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Provider | null>(null);

  if (route === 'providers/new') return <ProviderForm title="Nouveau prestataire" initial={blank()} onSubmit={onCreate} navigate={navigate} />;

  if (route.startsWith('providers/edit/')) {
    const id = route.replace('providers/edit/', '');
    const p = providers.find(x => x.id === id);
    if (!p) { navigate('providers'); return null; }
    return <ProviderForm title={`Modifier — ${p.name}`} navigate={navigate}
      initial={{ name: p.name, address: p.address, siret: p.siret, email: p.email, phone: p.phone, active: p.active }}
      onSubmit={f => onUpdate(id, f)} />;
  }

  const filtered = providers.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.siret.includes(search));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <PageHeader title="Prestataires" sub={`${providers.length} prestataire(s) enregistré(s)`} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher…"
              className="w-full rounded-xl border border-border pl-9 pr-4 py-2.5 outline-none focus:border-primary"
              style={{ background: 'white', fontSize: 14 }} />
          </div>
          <button onClick={() => navigate('providers/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
            <Plus className="w-4 h-4" /> Nouveau prestataire
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.length === 0 ? (
            <div className="col-span-3 py-16 bg-white rounded-2xl text-center" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
              <Store className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p style={{ fontSize: 14, color: '#6B7280' }}>Aucun prestataire trouvé</p>
            </div>
          ) : paged.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-5 transition-all hover:shadow-md" style={{ border: '1px solid rgba(17,24,39,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FEF3C7' }}>
                  <Store className="w-5 h-5" style={{ color: '#D97706' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{p.name}</div>
                  <span className="inline-block px-2 py-0.5 rounded-full mt-1" style={{ fontSize: 11, fontWeight: 600, background: p.active ? '#DCFCE7' : '#F3F4F6', color: p.active ? '#16A34A' : '#6B7280' }}>
                    {p.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                <div style={{ fontSize: 12, color: '#6B7280' }}>{p.address}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{p.email}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{p.phone}</div>
                <div className="font-mono" style={{ fontSize: 11, color: '#9CA3AF' }}>SIRET: {p.siret}</div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <button onClick={() => navigate(`providers/edit/${p.id}` as AdminRoute)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-border hover:border-primary hover:text-primary transition-all"
                  style={{ fontSize: 13, fontWeight: 500 }}>
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
                <button onClick={() => setConfirmDelete(p)}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Supprimer le prestataire ?</h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>Supprimer <strong>{confirmDelete.name}</strong> ?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-border" style={{ fontSize: 14 }}>Annuler</button>
              <button onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl" style={{ background: '#E63946', color: 'white', fontSize: 14, fontWeight: 600 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
