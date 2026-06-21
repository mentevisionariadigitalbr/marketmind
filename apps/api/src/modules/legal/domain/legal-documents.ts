/**
 * Documentos legais e suas VERSÕES vigentes. A versão é a data de publicação
 * (ISO). Ao revisar um texto, suba a versão correspondente — o aceite guarda qual
 * versão o usuário aceitou (prova de consentimento versionado).
 */
export type LegalDocumentType = 'TERMS' | 'PRIVACY';

export const LEGAL_VERSIONS: Record<LegalDocumentType, string> = {
  TERMS: '2026-06-22',
  PRIVACY: '2026-06-22',
};

export const ALL_LEGAL_DOCUMENTS: LegalDocumentType[] = ['TERMS', 'PRIVACY'];
