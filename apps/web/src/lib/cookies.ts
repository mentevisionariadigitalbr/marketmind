/** Nomes dos cookies de sessão. Em módulo próprio para serem usados também pelo
 * middleware (edge runtime), sem arrastar `next/headers`. */
export const ACCESS_COOKIE = 'mm_access';
export const REFRESH_COOKIE = 'mm_refresh';
/** Sessão do admin de plataforma — SEPARADA da sessão de cliente (fronteira). */
export const ADMIN_ACCESS_COOKIE = 'mm_admin_access';
