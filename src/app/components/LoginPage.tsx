import { useState } from 'react';
import { Eye, EyeOff, Lock, User, Ticket, ArrowRight } from 'lucide-react';
import { APP_NAME } from '../config/branding';
interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
}

const ROLE_HINTS = [
  { role: 'admin', username: 'admin', password: 'admin123', label: 'Administrateur', color: '#4361EE' },
  { role: 'provider', username: 'contact@la-pignata.fr', password: 'Prest@2026', label: 'Prestataire (ex.)', color: '#D97706' },
];

export function LoginPage({ onLogin, onForgotPassword }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (hint: typeof ROLE_HINTS[0]) => {
    setUsername(hint.username);
    setPassword(hint.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F0F2F7' }}>
      {/* Panneau gauche — branding */}
      <div
        className="hidden lg:flex lg:w-[48%] xl:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1e3a8a 0%, #4361EE 45%, #6B8EFF 100%)' }}
      >
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)',
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Ticket className="w-7 h-7 text-white" />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.3px' }}>{APP_NAME}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>Tickets restaurant</div>
            </div>
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 800, color: 'white', lineHeight: 1.15, letterSpacing: '-1px', maxWidth: 420 }}>
            Gérez vos tickets restaurant en toute simplicité
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', marginTop: 20, lineHeight: 1.6, maxWidth: 400 }}>
            Agents, prestataires et administrateurs accèdent à une plateforme unifiée pour la distribution, la validation et la facturation des tickets.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { n: '3', label: 'Espaces dédiés' },
            { n: 'QR', label: 'Validation instantanée' },
            { n: 'PDF', label: 'Export des tickets' },
          ].map(item => (
            <div key={item.label} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>{item.n}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #4361EE, #6B8EFF)' }}>
              <Ticket className="w-7 h-7 text-white" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{APP_NAME}</h1>
          </div>

          <div className="bg-white rounded-3xl p-8 lg:p-10" style={{ boxShadow: '0 8px 40px rgba(17,24,39,0.08)', border: '1px solid rgba(17,24,39,0.06)' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>Connexion</h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6, marginBottom: 28 }}>Accédez à votre espace personnel</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: '#374151' }}>
                  Identifiant ou email
                </label>
                <div className="flex items-center gap-3 px-4 rounded-xl border-2 border-transparent focus-within:border-primary transition-colors" style={{ background: '#F9FAFB', height: 50 }}>
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="ex: prenom@dirm.fr"
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: 15, color: '#111827' }}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8, color: '#374151' }}>
                  Mot de passe
                </label>
                <div className="flex items-center gap-3 px-4 rounded-xl border-2 border-transparent focus-within:border-primary transition-colors" style={{ background: '#F9FAFB', height: 50 }}>
                  <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: 15, color: '#111827' }}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl px-4 py-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 mt-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #4361EE, #5B7FFF)', color: 'white', fontSize: 15, fontWeight: 700 }}
              >
                {loading ? 'Connexion en cours…' : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
              </button>

              {onForgotPassword && (
                <button type="button" onClick={onForgotPassword}
                  className="w-full text-center pt-1" style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
                  Première connexion / mot de passe oublié
                </button>
              )}
            </form>
          </div>

          <div className="mt-8">
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Accès administrateur
            </p>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_HINTS.map(hint => (
                <button
                  key={hint.role}
                  onClick={() => quickLogin(hint)}
                  className="px-4 py-3 rounded-xl bg-white text-left transition-all hover:shadow-md"
                  style={{ border: `1px solid ${hint.color}30` }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: hint.color }}>{hint.label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 4 }}>{hint.username}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
