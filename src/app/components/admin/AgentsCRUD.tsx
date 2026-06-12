import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, ChevronLeft, User, Save, Mail } from 'lucide-react';
import * as api from '../../api';
import { Agent, AVATAR_COLORS } from '../../types';
import { Pagination } from '../shared/Pagination';
import { AdminRoute } from './AdminApp';
import { AdminFormLayout } from '../shared/AdminFormLayout';
import { FilterSelect } from '../shared/FilterSelect';
import { FormField, FormInput } from '../shared/AdminFormFields';

const PER_PAGE = 9;

interface Props {
  route: string;
  navigate: (r: AdminRoute) => void;
  agents: Agent[];
  onCreate: (a: Omit<Agent, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, a: Partial<Agent>) => Promise<void>;
  onDelete: (id: string) => void;
}

const blank = (): Omit<Agent, 'id' | 'createdAt'> => ({
  name: '', department: '', email: '', phone: '', code: '', active: true,
});

function PageHeader({ title, sub, back, onBack }: { title: string; sub?: string; back?: string; onBack?: () => void }) {
  return (
    <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 mb-3 hover:opacity-70 transition-opacity" style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
          <ChevronLeft className="w-4 h-4" />{back}
        </button>
      )}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function FormPage({
  title, back, initial, onSubmit, navigate, agentId,
}: {
  title: string; back: string; initial: Omit<Agent, 'id' | 'createdAt'>;
  onSubmit: (f: Omit<Agent, 'id' | 'createdAt'>) => Promise<void>;
  navigate: (r: AdminRoute) => void;
  agentId?: string;
}) {
  const [form, setForm] = useState(initial);
  const [emailMsg, setEmailMsg] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const f = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <AdminFormLayout title={title} backLabel="Retour aux agents" onBack={() => navigate('agents')} maxWidth="4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 lg:p-8 space-y-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Identité</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nom complet" req><FormInput value={form.name} onChange={e => f('name', e.target.value)} placeholder="Marie Dubois" /></FormField>
            <FormField label="Code agent" req>
              <FormInput value={form.code} onChange={e => f('code', e.target.value.toUpperCase())} placeholder="DUB" maxLength={5} />
            </FormField>
          </div>
          <FormField label="Service / Département" req><FormInput value={form.department} onChange={e => f('department', e.target.value)} placeholder="Direction RH" /></FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Email">
              <FormInput type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="m.dubois@mairie.fr" />
              {agentId && form.email && (
                <button type="button" disabled={sendingEmail}
                  onClick={async () => {
                    setSendingEmail(true);
                    setEmailMsg('');
                    try {
                      const r = await api.resendAgentSetupEmail(agentId);
                      setEmailMsg(r.emailed ? `Email d'activation envoyé à ${r.email}` : 'Compte mis à jour (vérifiez la config SMTP du serveur).');
                    } catch (err) {
                      setEmailMsg(err instanceof Error ? err.message : 'Erreur envoi email');
                    } finally {
                      setSendingEmail(false);
                    }
                  }}
                  className="mt-2 flex items-center gap-1.5 text-left disabled:opacity-50"
                  style={{ fontSize: 12, color: '#4361EE', fontWeight: 600 }}>
                  <Mail className="w-3.5 h-3.5" />
                  {sendingEmail ? 'Envoi…' : "Renvoyer l'email d'activation"}
                </button>
              )}
              {emailMsg && <p style={{ fontSize: 12, color: '#16A34A', marginTop: 6 }}>{emailMsg}</p>}
            </FormField>
            <FormField label="Téléphone"><FormInput value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="01 23 45 67 89" /></FormField>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Statut</h3>
            <FormField label="Compte agent">
              <FilterSelect variant="form" value={form.active ? 'true' : 'false'} onChange={e => f('active', e.target.value === 'true')}>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </FilterSelect>
            </FormField>
          </div>
          {saveError && <p style={{ fontSize: 13, color: '#DC2626' }}>{saveError}</p>}
          <div className="flex flex-col gap-3">
            <button type="button"
              onClick={async () => {
                setSaveError('');
                setSaving(true);
                try {
                  await onSubmit(form);
                  navigate('agents');
                } catch (err) {
                  setSaveError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || !form.name || !form.code || !form.department}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
              <Save className="w-4 h-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button onClick={() => navigate('agents')} className="px-5 py-3 rounded-xl border border-border bg-white" style={{ fontSize: 14, fontWeight: 500 }}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    </AdminFormLayout>
  );
}

export function AgentsCRUD({ route, navigate, agents, onCreate, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);

  // Route: agents/new
  if (route === 'agents/new') {
    return <FormPage key="agents-new" title="Nouvel agent" back="Retour" initial={blank()}
      onSubmit={onCreate} navigate={navigate} />;
  }

  // Route: agents/edit/:id
  if (route.startsWith('agents/edit/')) {
    const id = route.replace('agents/edit/', '');
    const agent = agents.find(a => a.id === id);
    if (!agent) { navigate('agents'); return null; }
    return <FormPage key={`agents-edit-${id}`} title={`Modifier — ${agent.name}`} back="Retour" navigate={navigate} agentId={id}
      initial={{ name: agent.name, department: agent.department, email: agent.email, phone: agent.phone, code: agent.code, active: agent.active }}
      onSubmit={f => onUpdate(id, f)} />;
  }

  // Route: agents (list)
  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.department.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <PageHeader title="Agents" sub={`${agents.length} agent(s) enregistré(s)`} />
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un agent…"
              className="w-full rounded-xl border border-border pl-9 pr-4 py-2.5 outline-none focus:border-primary"
              style={{ background: 'white', fontSize: 14 }} />
          </div>
          <button onClick={() => navigate('agents/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
            <Plus className="w-4 h-4" /> Nouvel agent
          </button>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.length === 0 ? (
            <div className="col-span-3 py-16 bg-white rounded-2xl text-center" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
              <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p style={{ fontSize: 14, color: '#6B7280' }}>Aucun agent trouvé</p>
            </div>
          ) : paged.map((agent, i) => (
            <div key={agent.id} className="bg-white rounded-2xl p-5 transition-all hover:shadow-md" style={{ border: '1px solid rgba(17,24,39,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length], fontSize: 13, fontWeight: 700 }}>
                  {agent.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{agent.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }} className="truncate">{agent.department}</div>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: agent.active ? '#DCFCE7' : '#F3F4F6', color: agent.active ? '#16A34A' : '#6B7280' }}>
                  {agent.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className="space-y-1.5 mb-4">
                <div style={{ fontSize: 12, color: '#6B7280' }}>{agent.email}</div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>{agent.phone}</div>
                <div className="inline-block px-2 py-0.5 rounded font-mono" style={{ fontSize: 11, background: '#F0F2F7', color: '#374151' }}>{agent.code}</div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <button onClick={() => navigate(`agents/edit/${agent.id}` as AdminRoute)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-border hover:border-primary hover:text-primary transition-all"
                  style={{ fontSize: 13, fontWeight: 500 }}>
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
                <button onClick={() => setConfirmDelete(agent)}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* Delete confirmation (inline, not modal) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Supprimer l'agent ?</h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              Cette action supprimera définitivement <strong>{confirmDelete.name}</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-border" style={{ fontSize: 14, fontWeight: 500 }}>Annuler</button>
              <button onClick={() => { onDelete(confirmDelete.id); setConfirmDelete(null); }}
                className="flex-1 py-2.5 rounded-xl" style={{ background: '#E63946', color: 'white', fontSize: 14, fontWeight: 600 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
