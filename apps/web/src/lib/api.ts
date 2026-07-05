/**
 * Cliente do backend MarketMind (NestJS). Usado por Route Handlers e Server
 * Components — nunca expõe tokens ao JavaScript do navegador.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export interface PublicUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  /** ISO date quando o e-mail foi verificado; null se ainda não verificado. */
  emailVerifiedAt: string | null;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: PublicUser;
  company: { id: string; name: string; taxId: string | null; taxRegime: string };
  /** Presente quando a sessão é uma impersonação do admin (somente leitura). */
  impersonation?: { readOnly: boolean; by: string | null } | null;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
}

/** Extrai mensagem de erro amigável de uma resposta de erro do backend. */
export async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    return body.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}
