import { LegalDocumentType } from '../legal-documents';

export const LEGAL_ACCEPTANCE_REPOSITORY = Symbol('LegalAcceptanceRepository');

export interface RecordAcceptanceData {
  userId: string;
  companyId: string;
  documentType: LegalDocumentType;
  version: string;
  ip: string | null;
  userAgent: string | null;
}

export interface LegalAcceptanceRecord {
  documentType: LegalDocumentType;
  version: string;
  acceptedAt: Date;
}

export interface LegalAcceptanceRepository {
  record(data: RecordAcceptanceData): Promise<void>;
  /** Aceites de um usuário (para a exportação de dados — Inc.3). */
  listForUser(userId: string): Promise<LegalAcceptanceRecord[]>;
}
