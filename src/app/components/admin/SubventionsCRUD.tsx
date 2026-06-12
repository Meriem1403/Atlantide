import { useState } from 'react';
import { Plus, Pencil, Trash2, ChevronLeft, Save, Euro } from 'lucide-react';
import { SubventionConfig, Agent } from '../../types';
import { Pagination } from '../shared/Pagination';
import { AdminRoute } from './AdminApp';
import { AdminFormLayout } from '../shared/AdminFormLayout';
import { FormInput } from '../shared/AdminFormFields';

const PER_PAGE = 8;

interface Props {
  route: string;
  navigate: (r: AdminRoute) => void;
  subventions: SubventionConfig[];
  agents: Agent[];
  onCreate: (s: Omit<SubventionConfig, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, s: Partial<SubventionConfig>) => void;
  onDelete: (id: string) => void;
}

const blank = (): Omit<SubventionConfig, 'id' | 'createdAt'> => ({
  label: '', faceValue: 9.0, subsidy: 5.4, ticketsPerMonth: 22, appliesTo: 'all', active: true,
});

function PageHeader({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
  return (
    <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 mb-3 hover:opacity-70 transition-opacity" style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
          <ChevronLeft className="w-4 h-4" /> Retour aux subventions
        </button>
      )}
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function SubventionForm({
  title, initial, agents, onSubmit, navigate,
}: {
  title: string; initial: Omit<SubventionConfig, 'id' | 'createdAt'>;
  agents: Agent[];
  onSubmit: (f: Omit<SubventionConfig, 'id' | 'createdAt'>) => void;
  navigate: (r: AdminRoute) => void;
}) {
  const [form, setForm] = useState(initial);
  const [targetMode, setTargetMode] = useState<'all' | 'specific'>(
    Array.isArray(initial.appliesTo) ? 'specific' : 'all'
  );
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    Array.isArray(initial.appliesTo) ? initial.appliesTo : []
  );

  const f = (k: keyof typeof form, v: string | number | boolean) => setForm(p => ({ ...p, [k]: v }));
  const toggleAgent = (id: string) => setSelectedAgents(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const subsidyPct = form.faceValue > 0 ? Math.round(form.subsidy / form.faceValue * 100) : 0;
  const agentPart = Math.max(0, form.faceValue - form.subsidy);

  const handleSave = () => {
    const appliesTo = targetMode === 'all' ? 'all' : selectedAgents;
    onSubmit({ ...form, appliesTo });
    navigate('subventions');
  };

  return (
    <AdminFormLayout title={title} backLabel="Retour aux subventions" onBack={() => navigate('subventions')} maxWidth="4xl">
        <div className="space-y-5">

          {/* Name */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Informations générales</h3>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>
                Nom de la configuration <span style={{ color: '#E63946' }}>*</span>
              </label>
              <FormInput
                value={form.label}
                onChange={e => f('label', e.target.value)}
                placeholder="Ex : Standard 2026, Direction RH, Cadres supérieurs…"
              />
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>Donnez un nom libre et descriptif à cette configuration.</p>
            </div>
            <div className="mt-4">
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>Statut</label>
              <div className="flex gap-3">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => f('active', v)}
                    className="flex-1 py-2.5 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: form.active === v ? '#4361EE' : 'rgba(17,24,39,0.09)',
                      background: form.active === v ? '#EEF2FF' : 'white',
                      color: form.active === v ? '#4361EE' : '#6B7280',
                      fontSize: 14, fontWeight: form.active === v ? 600 : 400,
                    }}>
                    {v ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Montants */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Montants</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>Valeur faciale (€)</label>
                <FormInput type="number" step="0.10" min="1" value={form.faceValue} onChange={e => f('faceValue', Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>
                  Subvention employeur (€) — <span style={{ color: '#4361EE' }}>{subsidyPct}%</span>
                </label>
                <FormInput type="number" step="0.10" min="0" max={form.faceValue} value={form.subsidy} onChange={e => f('subsidy', Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>
                Tickets par mois : <strong>{form.ticketsPerMonth}</strong>
              </label>
              <input type="range" min={1} max={31} value={form.ticketsPerMonth}
                onChange={e => f('ticketsPerMonth', Number(e.target.value))}
                className="w-full" style={{ accentColor: '#4361EE' }} />
            </div>

            {/* Visual recap */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Valeur faciale', value: `${form.faceValue.toFixed(2)} €`, color: '#374151', bg: '#F9FAFB' },
                { label: 'Subvention ({subsidyPct}%)', labelFmt: `Subvention (${subsidyPct}%)`, value: `${form.subsidy.toFixed(2)} €`, color: '#4361EE', bg: '#EEF2FF' },
                { label: 'Coût mensuel employeur', value: `${(form.subsidy * form.ticketsPerMonth).toFixed(0)} €`, color: '#2DC653', bg: '#DCFCE7' },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: item.bg }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 3 }}>{('labelFmt' in item ? item.labelFmt : item.label)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Applicability */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>S'applique à</h3>
            <div className="flex gap-3 mb-4">
              {(['all', 'specific'] as const).map(m => (
                <button key={m} onClick={() => setTargetMode(m)}
                  className="flex-1 py-2.5 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: targetMode === m ? '#4361EE' : 'rgba(17,24,39,0.09)',
                    background: targetMode === m ? '#EEF2FF' : 'white',
                    color: targetMode === m ? '#4361EE' : '#6B7280',
                    fontSize: 14, fontWeight: targetMode === m ? 600 : 400,
                  }}>
                  {m === 'all' ? 'Tous les agents' : 'Agents spécifiques'}
                </button>
              ))}
            </div>
            {targetMode === 'specific' && (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {agents.filter(a => a.active).map(agent => (
                  <label key={agent.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedAgents.includes(agent.id)} onChange={() => toggleAgent(agent.id)}
                      className="w-4 h-4 rounded" style={{ accentColor: '#4361EE' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{agent.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{agent.department}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('subventions')} className="px-5 py-2.5 rounded-xl border border-border bg-white" style={{ fontSize: 14, fontWeight: 500 }}>Annuler</button>
            <button onClick={handleSave} disabled={!form.label.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
              <Save className="w-4 h-4" /> Enregistrer
            </button>
          </div>
        </div>
    </AdminFormLayout>
  );
}

export function SubventionsCRUD({ route, navigate, subventions, agents, onCreate, onUpdate, onDelete }: Props) {
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<SubventionConfig | null>(null);

  if (route === 'subventions/new') {
    return <SubventionForm title="Nouvelle configuration de subvention" initial={blank()} agents={agents} onSubmit={onCreate} navigate={navigate} />;
  }

  if (route.startsWith('subventions/edit/')) {
    const id = route.replace('subventions/edit/', '');
    const sv = subventions.find(s => s.id === id);
    if (!sv) { navigate('subventions'); return null; }
    return <SubventionForm title={`Modifier — ${sv.label}`} agents={agents} navigate={navigate}
      initial={{ label: sv.label, faceValue: sv.faceValue, subsidy: sv.subsidy, ticketsPerMonth: sv.ticketsPerMonth, appliesTo: sv.appliesTo, active: sv.active }}
      onSubmit={f => onUpdate(id, f)} />;
  }

  // List
  const paged = subventions.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#F0F2F7' }}>
      <div className="px-6 lg:px-8 pt-6 pb-4 shrink-0 bg-white border-b border-border" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>Configurations de subvention</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>Créez autant de configurations que nécessaire avec le nom de votre choix</p>
          </div>
          <button onClick={() => navigate('subventions/new')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
            <Plus className="w-4 h-4" /> Nouvelle configuration
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-4">
        {paged.length === 0 ? (
          <div className="py-16 bg-white rounded-2xl flex flex-col items-center gap-4" style={{ border: '1px solid rgba(17,24,39,0.07)' }}>
            <Euro className="w-10 h-10 text-muted-foreground" />
            <p style={{ fontSize: 14, color: '#6B7280' }}>Aucune configuration. Créez-en une pour commencer.</p>
            <button onClick={() => navigate('subventions/new')}
              className="px-5 py-2.5 rounded-xl" style={{ background: '#4361EE', color: 'white', fontSize: 14, fontWeight: 600 }}>
              Créer ma première configuration
            </button>
          </div>
        ) : paged.map(s => {
          const pct = s.faceValue > 0 ? Math.round(s.subsidy / s.faceValue * 100) : 0;
          const appLabel = s.appliesTo === 'all' ? 'Tous les agents' : `${(s.appliesTo as string[]).length} agent(s) spécifique(s)`;
          return (
            <div key={s.id} className="bg-white rounded-2xl overflow-hidden transition-all hover:shadow-md" style={{ border: '1px solid rgba(17,24,39,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div className="p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
                  <Euro className="w-5 h-5" style={{ color: '#4361EE' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>{s.label}</h3>
                    <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: s.active ? '#DCFCE7' : '#F3F4F6', color: s.active ? '#16A34A' : '#6B7280' }}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'VALEUR FACIALE', value: `${s.faceValue.toFixed(2)} €`, color: '#374151' },
                      { label: `SUBVENTION (${pct}%)`, value: `${s.subsidy.toFixed(2)} €`, color: '#4361EE' },
                      { label: 'TICKETS/MOIS', value: String(s.ticketsPerMonth), color: '#F59E0B' },
                      { label: 'COÛT MENSUEL', value: `${(s.subsidy * s.ticketsPerMonth).toFixed(0)} €`, color: '#2DC653' },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl p-3" style={{ background: '#F9FAFB' }}>
                        <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>S'applique à : {appLabel}</p>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-border flex gap-2" style={{ background: '#FAFAFA' }}>
                <button onClick={() => navigate(`subventions/edit/${s.id}` as AdminRoute)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white hover:border-primary hover:text-primary transition-all"
                  style={{ fontSize: 13, fontWeight: 500 }}>
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
                <button onClick={() => setConfirmDelete(s)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-white hover:border-red-300 hover:text-red-500 transition-all"
                  style={{ fontSize: 13, fontWeight: 500 }}>
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </div>
          );
        })}
        <Pagination page={page} total={subventions.length} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Supprimer la configuration ?</h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              Supprimer <strong>{confirmDelete.label}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-border" style={{ fontSize: 14 }}>Annuler</button>
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
