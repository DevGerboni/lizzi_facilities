import { API_BASE } from '../config';

// Normaliza a URL de uma imagem salva. Os arquivos SEMPRE ficam em
// <API_BASE>/uploads/..., então reconstruímos a URL a partir do trecho
// "/uploads/...". Assim a imagem carrega mesmo que o valor salvo no banco
// tenha uma base errada (problema do app_base_url / pasta aninhada no servidor),
// e também funciona para uploads antigos já gravados com a URL torta.
export function urlImagem(u?: string | null): string {
  if (!u) return '';
  const i = u.indexOf('/uploads/');
  if (i >= 0) return API_BASE + u.slice(i);
  if (/^https?:\/\//i.test(u)) return u;          // URL externa qualquer
  return API_BASE + '/' + u.replace(/^\/+/, '');  // caminho relativo solto
}

// Reduz/recomprime a imagem NO NAVEGADOR antes de enviar, para não estourar os
// limites de upload do PHP (upload_max_filesize / post_max_size). Converte para
// WebP (leve e mantém transparência). Tipos não-imagem ou GIF passam intactos, e
// qualquer falha cai no original — nunca quebra o envio.
export async function comprimirImagem(file: File, maxLado = 1600, qualidade = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const dataUrl: string = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(new Error('read'));
      fr.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('img'));
      im.src = dataUrl;
    });
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) return file;
    if (w > maxLado || h > maxLado) {
      if (w >= h) { h = Math.round((h * maxLado) / w); w = maxLado; }
      else { w = Math.round((w * maxLado) / h); h = maxLado; }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/webp', qualidade));
    if (!blob || blob.size >= file.size) return file; // não ajudou → mantém o original
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  empresa_id: number | null;
  empresa_nome?: string | null;
  plano?: string | null;
  db_nome?: string | null;
}

const TOKEN_KEY = 'lizzi_token';
const USER_KEY = 'lizzi_user';

export const getToken = (): string => localStorage.getItem(TOKEN_KEY) || '';
export const getUser = (): Usuario | null => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
};
export const setSession = (token: string, usuario: Usuario | null): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario || null));
};
export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

interface Opts {
  method?: string;
  body?: unknown;
  isForm?: boolean;
}

// Recurso exclusivo do plano Premium (backend responde 402). No modo Simples
// esses recursos ficam ocultos (menu, rotas e chamadas já são filtrados por
// isPremium). Se ainda assim uma chamada vazar até aqui, interrompemos o fluxo
// SEM mensagem — a `message` vazia faz os blocos `{erro && ...}` não renderarem.
export class RecursoPremiumError extends Error {
  constructor() {
    super('');
    this.name = 'RecursoPremiumError';
  }
}

// Chamada à API. Retorna o `data` da resposta padrão { success, data, message }.
export async function api<T = any>(path: string, { method = 'GET', body, isForm = false }: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let payload: BodyInit | undefined;
  if (isForm) {
    payload = body as BodyInit;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  // Erro de rede (servidor fora do ar, sem internet, CORS, URL errada): fetch lança TypeError.
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: payload });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente em instantes.');
  }

  let json: any = null;
  try { json = await res.json(); } catch { /* resposta não-JSON */ }

  if (res.status === 401) {
    clearSession();
    if (!window.location.hash.startsWith('#/login')) window.location.assign('#/login');
    throw new Error(json?.message || 'Sua sessão expirou. Entre novamente para continuar.');
  }

  // 402 = funcionalidade exclusiva do Premium. No modo Simples nunca mostramos
  // a mensagem "Funcionalidade disponível apenas no plano Premium": apenas
  // abortamos a chamada silenciosamente.
  if (res.status === 402) {
    throw new RecursoPremiumError();
  }

  if (!res.ok) {
    // Mensagem do backend (já em pt-br) tem prioridade; senão, texto amigável por status.
    if (json?.message) throw new Error(json.message);
    const padrao: Record<number, string> = {
      400: 'Não entendemos a solicitação. Confira os dados e tente de novo.',
      403: 'Você não tem permissão para fazer isso.',
      404: 'Não encontramos o que você procura.',
      409: 'Esse registro já existe. Tente com outros dados.',
      422: 'Alguns campos precisam de atenção. Revise e tente novamente.',
      500: 'Tivemos um problema no servidor. Tente novamente em instantes.',
      502: 'O serviço está indisponível no momento. Tente novamente em instantes.',
    };
    throw new Error(padrao[res.status] || 'Algo deu errado. Tente novamente em instantes.');
  }

  return (json && json.data !== undefined ? json.data : json) as T;
}
