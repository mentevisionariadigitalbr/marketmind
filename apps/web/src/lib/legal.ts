/**
 * Versões vigentes dos documentos legais (espelham `LEGAL_VERSIONS` da API). Ao
 * revisar um texto, atualize a data aqui e na API juntas.
 */
export const LEGAL_VERSIONS = {
  TERMS: '2026-06-22',
  PRIVACY: '2026-06-22',
  COOKIES: '2026-06-22',
} as const;

export const SUPPORT_EMAIL = 'privacidade@marketmind.ai';

/** Cookie (não-httpOnly) que registra que o aviso de cookies foi reconhecido. */
export const COOKIE_CONSENT_NAME = 'mm_cookie_consent';
