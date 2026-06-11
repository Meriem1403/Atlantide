import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { OrgLogo } from '../shared/OrgLogo';
import { AdminFormLayout } from '../shared/AdminFormLayout';

interface Props {
  orgName: string;
  orgLogo: string;
  notificationEmail: string;
  onSave: (orgName: string, orgLogo: string, notificationEmail?: string) => void;
}

export function SettingsPage({ orgName, orgLogo, notificationEmail, onSave }: Props) {
  const [name, setName] = useState(orgName);
  const [logo, setLogo] = useState(orgLogo);
  const [notifEmail, setNotifEmail] = useState(notificationEmail);
  const [saved, setSaved] = useState(false);

  // Sync when props change (e.g. external update)
  useEffect(() => { setName(orgName); }, [orgName]);
  useEffect(() => { setLogo(orgLogo); }, [orgLogo]);
  useEffect(() => { setNotifEmail(notificationEmail); }, [notificationEmail]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(name, logo, notifEmail);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AdminFormLayout title="Paramètres" subtitle="Configuration générale de l'application" maxWidth="4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {saved && (
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#16A34A' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#16A34A' }}>Paramètres enregistrés avec succès !</span>
            </div>
          )}

          {/* Organisation */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Organisation</h3>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>
                Nom de l'organisation
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Mairie de Paris"
                className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary transition-colors"
                style={{ background: '#F9FAFB', fontSize: 15 }}
              />
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 5 }}>
                Ce nom apparaît sur les tickets PDF et dans l'interface.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Notifications email</h3>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: '#374151' }}>
              Email administrateur
            </label>
            <input
              value={notifEmail}
              onChange={e => setNotifEmail(e.target.value)}
              type="email"
              placeholder="compta@mairie.fr"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary transition-colors"
              style={{ background: '#F9FAFB', fontSize: 15 }}
            />
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
              Reçoit les alertes : nouvelles factures, validations, génération de tickets.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Logo de l'organisation</h3>
            <div className="flex items-start gap-5">
              {/* Preview */}
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0"
                style={{ background: '#F9FAFB', borderColor: logo ? '#4361EE' : 'rgba(17,24,39,0.12)' }}>
                {logo
                  ? <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
                  : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 1.6 }}>
                  Ce logo sera intégré dans les tickets PDF. Format PNG recommandé avec fond transparent. Taille idéale : 200×200 px.
                </p>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer">
                    <span className="inline-block px-4 py-2 rounded-xl border border-border bg-white hover:border-primary hover:text-primary transition-all"
                      style={{ fontSize: 13, fontWeight: 500 }}>
                      {logo ? 'Remplacer le logo' : 'Choisir un fichier'}
                    </span>
                    <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {logo && (
                    <button onClick={() => setLogo('')}
                      style={{ fontSize: 13, color: '#E63946', fontWeight: 500 }}>
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preview on ticket */}
            {logo && (
              <div className="mt-5 p-4 rounded-xl" style={{ background: '#F0F2F7' }}>
                <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 8 }}>APERÇU SUR UN TICKET PDF</div>
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #4361EE, #6B8EFF)', maxWidth: 320 }}>
                  <OrgLogo src={logo} size={44} onDark />
                  <div>
                    <div style={{ fontSize: 12, color: 'white', fontWeight: 700 }}>{name || 'Organisation'}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Ticket restaurant</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid rgba(17,24,39,0.07)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Comptes d'accès</h3>
            <div className="space-y-2">
              {[
                { role: 'Admin', user: 'admin', pass: 'admin123', color: '#4361EE', bg: '#EEF2FF' },
                { role: 'Agents', user: 'm.dubois, t.martin…', pass: 'marie2026, thomas2026…', color: '#2DC653', bg: '#DCFCE7' },
                { role: 'Prestataires', user: 'lafourchette, midiexpress', pass: 'prest123, prest456', color: '#D97706', bg: '#FEF3C7' },
              ].map(item => (
                <div key={item.role} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: item.bg }}>
                  <span className="shrink-0 px-2.5 py-1 rounded-lg" style={{ fontSize: 11, fontWeight: 700, background: item.color, color: 'white' }}>{item.role}</span>
                  <div className="flex-1 min-w-0">
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>{item.user}</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}> / </span>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>{item.pass}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button onClick={handleSave}
            className="lg:col-span-2 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl transition-all hover:opacity-90"
            style={{ background: '#4361EE', color: 'white', fontSize: 15, fontWeight: 700 }}>
            <Save className="w-5 h-5" /> Enregistrer les paramètres
          </button>
        </div>
    </AdminFormLayout>
  );
}
