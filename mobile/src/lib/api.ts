import { API_BASE, API_ORIGIN } from '../config/app';
import { clearSession, getToken } from './auth-storage';

export class RecursoPremiumError extends Error {
  constructor(message = 'Este recurso está disponível apenas no plano premium.') {
    super(message);
    this.name = 'RecursoPremiumError';
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; isForm?: boolean } = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = 'Bearer ' + token;

  let body: BodyInit | undefined;
  if (options.isForm) {
    body = options.body as BodyInit;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers,
      body,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (res.status === 401) {
    await clearSession();
    throw new Error('Sua sessão expirou. Entre novamente.');
  }

  if (res.status === 402) {
    throw new RecursoPremiumError(json?.message);
  }

  if (!res.ok) {
    throw new Error(json?.message || 'Não foi possível concluir a ação.');
  }

  return (json && json.data !== undefined ? json.data : json) as T;
}

export function resolverUrlArquivo(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}
