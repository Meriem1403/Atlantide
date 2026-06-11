import { useState } from 'react';
import { Lock, Mail, ArrowLeft, Ticket } from 'lucide-react';
import * as api from '../api';
import { APP_NAME } from '../config/branding';

type Mode = 'forgot' | 'setup' | 'reset';

export function AuthPages({
  mode,
  token,
  onDone,
  onBack,
}: {
  mode: Mode;
  token: string;
  onDone: (user?: import('../types').CurrentUser) => void;
  onBack: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const titles: Record<Mode, string> = {
    setup: 'Créer votre mot de passe',
    reset: 'Nouveau mot de passe',
    forgot: 'Mot de passe oublié',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await api.forgotPassword(email.trim());
        setSuccess('Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'setup') {
        const user = await api.setupPassword(token, password);
        onDone(user);
        return;
      }
      await api.resetPassword(token, password);
      setSuccess('Mot de passe mis à jour. Vous pouvez vous connecter.');
      setTimeout(onDone, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F0F2F7' }}>
      <div className="w-full max-w-md bg-white rounded-3xl p-8" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}>
        <button onClick={onBack} className="flex items-center gap-1.5 mb-6" style={{ fontSize: 13, color: '#4361EE', fontWeight: 500 }}>
          <ArrowLeft className="w-4 h-4" /> Retour à la connexion
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#EEF2FF' }}>
            <Ticket className="w-5 h-5" style={{ color: '#4361EE' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{APP_NAME}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{titles[mode]}</h1>
          </div>
        </div>

        {mode === 'forgot' && (
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
            Saisissez votre adresse email professionnelle. Vous recevrez un lien pour définir un nouveau mot de passe.
          </p>
        )}

        {(mode === 'setup' || mode === 'reset') && (
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
            Choisissez un mot de passe sécurisé (8 caractères minimum).
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'forgot' ? (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full rounded-xl border border-border pl-10 pr-4 py-2.5 outline-none focus:border-primary"
                  placeholder="prenom@dirm.fr" style={{ fontSize: 14 }} />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                    className="w-full rounded-xl border border-border pl-10 pr-4 py-2.5 outline-none focus:border-primary"
                    style={{ fontSize: 14 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Confirmer</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8}
                    className="w-full rounded-xl border border-border pl-10 pr-4 py-2.5 outline-none focus:border-primary"
                    style={{ fontSize: 14 }} />
                </div>
              </div>
            </>
          )}

          {error && <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: '#16A34A' }}>{success}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: '#4361EE', color: 'white', fontSize: 15, fontWeight: 700 }}>
            {loading ? 'Envoi…' : mode === 'forgot' ? 'Envoyer le lien' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function ChangePasswordModal({
  mustChange,
  onDone,
  onLogout,
}: {
  mustChange?: boolean;
  onDone: () => void;
  onLogout: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return setError('8 caractères minimum.');
    if (newPassword !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    try {
      await api.changePassword(mustChange ? undefined : currentPassword, newPassword);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          {mustChange ? 'Définissez votre mot de passe' : 'Changer le mot de passe'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          {!mustChange && (
            <input type="password" placeholder="Mot de passe actuel" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} required
              className="w-full rounded-xl border border-border px-4 py-2.5" />
          )}
          <input type="password" placeholder="Nouveau mot de passe" value={newPassword}
            onChange={e => setNewPassword(e.target.value)} required minLength={8}
            className="w-full rounded-xl border border-border px-4 py-2.5" />
          <input type="password" placeholder="Confirmer" value={confirm}
            onChange={e => setConfirm(e.target.value)} required minLength={8}
            className="w-full rounded-xl border border-border px-4 py-2.5" />
          {error && <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            {!mustChange && (
              <button type="button" onClick={onLogout} className="flex-1 py-2.5 rounded-xl border border-border">Annuler</button>
            )}
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-white" style={{ background: '#4361EE' }}>
              {loading ? '…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
