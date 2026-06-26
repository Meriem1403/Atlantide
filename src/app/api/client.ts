const TOKEN_KEY = 'ticketsrepas_token';

/** Sur Netlify, toujours passer par le proxy /api (ignore l'ancienne URL Render en dur dans le build). */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('netlify.app') || host.endsWith('netlify.com')) {
      return '/api';
    }
  }
  return import.meta.env.VITE_API_URL || '/api';
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

type ApiFetchOptions = RequestInit & { timeoutMs?: number };

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { timeoutMs = 90_000, ...fetchOptions } = options;
  const token = getToken();
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, { ...fetchOptions, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Le serveur met trop de temps à répondre (démarrage Render). Attendez 30 secondes et réessayez.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Le serveur API ne répond pas correctement. Réessayez dans quelques instants.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur HTTP ${res.status}`);
  }
  return data as T;
}

export async function wakeApi(): Promise<void> {
  try {
    await apiFetch('/health', { timeoutMs: 90_000 });
  } catch {
    // ignore — le but est juste de réveiller Render
  }
}
