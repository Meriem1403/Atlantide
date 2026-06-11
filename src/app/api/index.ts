import {
  AppState, CurrentUser, Agent, Provider, SubventionConfig, ProviderInvoice,
} from '../types';
import { apiFetch, setToken } from './client';

interface LoginResponse {
  token: string;
  user: CurrentUser;
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export function logout() {
  setToken(null);
}

export async function getMe(): Promise<CurrentUser> {
  const data = await apiFetch<{ user: CurrentUser }>('/auth/me');
  return data.user;
}

export async function setupPassword(token: string, password: string): Promise<CurrentUser> {
  const data = await apiFetch<LoginResponse>('/auth/setup-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function forgotPassword(email: string) {
  return apiFetch<{ success: boolean; message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return apiFetch<{ success: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function changePassword(currentPassword: string | undefined, newPassword: string) {
  return apiFetch<{ success: boolean }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function fetchAppState(): Promise<AppState> {
  return apiFetch<AppState>('/app-state');
}

export async function createAgent(agent: Omit<Agent, 'id' | 'createdAt'>) {
  return apiFetch<Agent>('/agents', { method: 'POST', body: JSON.stringify(agent) });
}

export async function updateAgent(id: string, agent: Partial<Agent>) {
  return apiFetch<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(agent) });
}

export async function deleteAgent(id: string) {
  return apiFetch<void>(`/agents/${id}`, { method: 'DELETE' });
}

export async function createProvider(provider: Omit<Provider, 'id' | 'createdAt'>) {
  return apiFetch<Provider>('/providers', { method: 'POST', body: JSON.stringify(provider) });
}

export async function updateProvider(id: string, provider: Partial<Provider>) {
  return apiFetch<Provider>(`/providers/${id}`, { method: 'PUT', body: JSON.stringify(provider) });
}

export async function deleteProvider(id: string) {
  return apiFetch<void>(`/providers/${id}`, { method: 'DELETE' });
}

export async function createSubvention(sv: Omit<SubventionConfig, 'id' | 'createdAt'>) {
  return apiFetch<SubventionConfig>('/subventions', { method: 'POST', body: JSON.stringify(sv) });
}

export async function updateSubvention(id: string, sv: Partial<SubventionConfig>) {
  return apiFetch<SubventionConfig>(`/subventions/${id}`, { method: 'PUT', body: JSON.stringify(sv) });
}

export async function deleteSubvention(id: string) {
  return apiFetch<void>(`/subventions/${id}`, { method: 'DELETE' });
}

export interface TicketGenerationItem {
  agentId: string;
  count: number;
  faceValue: number;
  subsidy: number;
}

export async function generateTickets(agentId: string, month: string, count: number, faceValue: number, subsidy: number) {
  return apiFetch('/tickets/generate', {
    method: 'POST',
    body: JSON.stringify({ agentId, month, count, faceValue, subsidy }),
  });
}

export async function generateTicketsBatch(month: string, items: TicketGenerationItem[]) {
  return apiFetch<{ totalTickets: number; agentCount: number; summaries: { agentId: string; agentName: string; count: number }[] }>(
    '/tickets/generate-batch',
    { method: 'POST', body: JSON.stringify({ month, items }) },
  );
}

export async function cancelTicket(id: string) {
  return apiFetch(`/tickets/${id}/cancel`, { method: 'PATCH' });
}

export async function deleteTicket(id: string) {
  return apiFetch<void>(`/tickets/${id}`, { method: 'DELETE' });
}

export async function validateTicket(ticketNumber: string): Promise<{ success: boolean; message: string }> {
  return apiFetch('/tickets/validate', {
    method: 'POST',
    body: JSON.stringify({ ticketNumber }),
  });
}

export async function submitInvoice(inv: Omit<ProviderInvoice, 'id' | 'submittedAt' | 'status'>) {
  return apiFetch<ProviderInvoice>('/invoices', { method: 'POST', body: JSON.stringify(inv) });
}

export async function approveInvoice(id: string, note: string) {
  return apiFetch<ProviderInvoice>(`/invoices/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
}

export async function rejectInvoice(id: string, note: string) {
  return apiFetch<ProviderInvoice>(`/invoices/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ note }),
  });
}

export interface DatadocReport {
  month: string;
  monthLabel: string;
  orgName: string;
  orgLogo: string;
  services: {
    name: string;
    agents: {
      agentId: string;
      name: string;
      department: string;
      ticketCount: number;
      numerotation: string;
      faceValue: number;
      subsidy: number;
      notes: string;
    }[];
    totalTickets: number;
    defaultTicketCount: number;
  }[];
  providers: Provider[];
  totals: { agents: number; tickets: number; providers: number };
}

export async function fetchDatadocReport(month = '2026-07'): Promise<DatadocReport> {
  return apiFetch<DatadocReport>(`/datadoc/report?month=${month}`);
}

export async function importDatadoc(): Promise<{ success: boolean; output: string }> {
  return apiFetch('/datadoc/import', { method: 'POST' });
}

export async function updateSettings(orgName: string, orgLogo: string, notificationEmail?: string) {
  return apiFetch<{ orgName: string; orgLogo: string; notificationEmail: string }>('/settings', {
    method: 'PUT',
    body: JSON.stringify({ orgName, orgLogo, notificationEmail }),
  });
}
