import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  AppState, CurrentUser, Agent, Provider, SubventionConfig, ProviderInvoice,
} from './types';
import * as api from './api';
import { getToken } from './api/client';
import { LoginPage } from './components/LoginPage';
import { AuthPages } from './components/AuthPages';
import { AdminApp } from './components/admin/AdminApp';
import { AgentApp } from './components/agent/AgentApp';
import { ProviderApp } from './components/provider/ProviderApp';

const EMPTY_STATE: AppState = {
  users: [],
  agents: [],
  providers: [],
  subventions: [],
  tickets: [],
  providerInvoices: [],
  monthlyPlans: [],
  orgName: '',
  orgLogo: '',
};

type AuthView = 'login' | 'forgot' | 'setup' | 'reset';

function resolveAuthView(): { view: AuthView; token: string } {
  const path = window.location.pathname;
  const token = new URLSearchParams(window.location.search).get('token') || '';
  if (path.includes('set-password') && token) return { view: 'setup', token };
  if (path.includes('reset-password') && token) return { view: 'reset', token };
  return { view: 'login', token: '' };
}

export default function App() {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [booting, setBooting] = useState(true);
  const initialAuth = useMemo(() => resolveAuthView(), []);
  const [authView, setAuthView] = useState<AuthView>(initialAuth.view);
  const [authToken, setAuthToken] = useState(initialAuth.token);

  const refreshState = useCallback(async () => {
    const data = await api.fetchAppState();
    setState(data);
  }, []);

  const clearAuthUrl = useCallback(() => {
    window.history.replaceState({}, '', '/');
    setAuthView('login');
    setAuthToken('');
  }, []);

  useEffect(() => {
    (async () => {
      if (initialAuth.view !== 'login') {
        setBooting(false);
        return;
      }
      if (!getToken()) {
        setBooting(false);
        return;
      }
      try {
        const data = await api.fetchAppState();
        setState(data);
        setCurrentUser(await api.getMe());
      } catch {
        api.logout();
      } finally {
        setBooting(false);
      }
    })();
  }, [initialAuth.view]);

  const login = useCallback(async (username: string, password: string) => {
    const user = await api.login(username, password);
    setCurrentUser(user);
    await refreshState();
  }, [refreshState]);

  const completeAuth = useCallback(async (user?: CurrentUser) => {
    clearAuthUrl();
    if (user) {
      setCurrentUser(user);
      await refreshState();
    }
  }, [clearAuthUrl, refreshState]);

  const logout = useCallback(() => {
    api.logout();
    setCurrentUser(null);
    setState(EMPTY_STATE);
    clearAuthUrl();
  }, [clearAuthUrl]);

  const wrap = useCallback(<T, R>(fn: (...args: T[]) => Promise<R>) => {
    return async (...args: T[]): Promise<R> => {
      const result = await fn(...args);
      await refreshState();
      return result;
    };
  }, [refreshState]);

  const createAgent = useCallback(wrap((a: Omit<Agent, 'id' | 'createdAt'>) => api.createAgent(a)), [wrap]);
  const updateAgent = useCallback(wrap((id: string, a: Partial<Agent>) => api.updateAgent(id, a)), [wrap]);
  const deleteAgent = useCallback(wrap((id: string) => api.deleteAgent(id)), [wrap]);
  const createProvider = useCallback(wrap((p: Omit<Provider, 'id' | 'createdAt'>) => api.createProvider(p)), [wrap]);
  const updateProvider = useCallback(wrap((id: string, p: Partial<Provider>) => api.updateProvider(id, p)), [wrap]);
  const deleteProvider = useCallback(wrap((id: string) => api.deleteProvider(id)), [wrap]);
  const createSubvention = useCallback(wrap((sv: Omit<SubventionConfig, 'id' | 'createdAt'>) => api.createSubvention(sv)), [wrap]);
  const updateSubvention = useCallback(wrap((id: string, sv: Partial<SubventionConfig>) => api.updateSubvention(id, sv)), [wrap]);
  const deleteSubvention = useCallback(wrap((id: string) => api.deleteSubvention(id)), [wrap]);
  const generateTicketsBatch = useCallback(wrap((month: string, items: api.TicketGenerationItem[]) =>
    api.generateTicketsBatch(month, items)), [wrap]);
  const cancelTicket = useCallback(wrap((id: string) => api.cancelTicket(id)), [wrap]);
  const deleteTicket = useCallback(wrap((id: string) => api.deleteTicket(id)), [wrap]);
  const approveInvoice = useCallback(wrap((id: string, note: string) => api.approveInvoice(id, note)), [wrap]);
  const rejectInvoice = useCallback(wrap((id: string, note: string) => api.rejectInvoice(id, note)), [wrap]);
  const updateSettings = useCallback(wrap((orgName: string, orgLogo: string, notificationEmail?: string) =>
    api.updateSettings(orgName, orgLogo, notificationEmail)), [wrap]);

  const validateTicket = useCallback(async (ticketNumber: string, _providerId: string, _providerName: string) => {
    const result = await api.validateTicket(ticketNumber);
    await refreshState();
    return result;
  }, [refreshState]);

  const submitInvoice = useCallback(async (inv: Omit<ProviderInvoice, 'id' | 'submittedAt' | 'status'>) => {
    await api.submitInvoice(inv);
    await refreshState();
  }, [refreshState]);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p style={{ fontSize: 14, color: '#6E6E73' }}>Chargement…</p>
      </div>
    );
  }

  if (!currentUser) {
    if (authView === 'forgot' || authView === 'setup' || authView === 'reset') {
      return (
        <AuthPages
          mode={authView === 'forgot' ? 'forgot' : authView}
          token={authToken}
          onDone={completeAuth}
          onBack={clearAuthUrl}
        />
      );
    }
    return (
      <LoginPage
        onLogin={login}
        onForgotPassword={() => setAuthView('forgot')}
      />
    );
  }

  if (currentUser.role === 'admin') return (
    <AdminApp
      state={state} user={currentUser} onLogout={logout}
      onCreateAgent={createAgent} onUpdateAgent={updateAgent} onDeleteAgent={deleteAgent}
      onCreateProvider={createProvider} onUpdateProvider={updateProvider} onDeleteProvider={deleteProvider}
      onCreateSubvention={createSubvention} onUpdateSubvention={updateSubvention} onDeleteSubvention={deleteSubvention}
      onGenerateTicketsBatch={generateTicketsBatch} onCancelTicket={cancelTicket} onDeleteTicket={deleteTicket}
      onApproveInvoice={approveInvoice} onRejectInvoice={rejectInvoice}
      onUpdateSettings={updateSettings}
    />
  );

  if (currentUser.role === 'agent') return (
    <AgentApp user={currentUser} state={state} onLogout={logout} />
  );

  if (currentUser.role === 'provider') return (
    <ProviderApp user={currentUser} state={state} onValidate={validateTicket} onSubmitInvoice={submitInvoice} onLogout={logout} />
  );

  return null;
}
