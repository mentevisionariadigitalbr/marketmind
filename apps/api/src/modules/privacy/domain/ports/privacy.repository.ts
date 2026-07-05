export const PRIVACY_REPOSITORY = Symbol('PrivacyRepository');

export type DataSubjectScope = 'USER' | 'COMPANY';
export type DataSubjectType = 'EXPORT' | 'DELETION';

export interface UserDataExport {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    emailVerified: boolean;
    createdAt: string;
  } | null;
  company: {
    id: string;
    name: string;
    taxId: string | null;
    taxRegime: string;
    createdAt: string;
  } | null;
  sessions: {
    createdAt: string;
    ip: string | null;
    userAgent: string | null;
    revokedAt: string | null;
    expiresAt: string;
  }[];
  auditLog: {
    action: string;
    method: string;
    path: string;
    statusCode: number;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
  }[];
}

export interface PrivacyRepository {
  /** Dados pessoais do usuário + dados básicos da empresa (tenant-scoped). */
  exportUserData(userId: string, companyId: string): Promise<UserDataExport>;
  /** Registra um pedido de direito do titular (quem/quando/tipo/escopo). */
  recordRequest(data: {
    userId: string;
    companyId: string;
    type: DataSubjectType;
    scope: DataSubjectScope;
  }): Promise<void>;
  /**
   * Executa a exclusão em UMA transação (anonimiza usuário(s); se COMPANY, purga
   * dados de negócio e anonimiza a empresa) e registra o pedido. Retém faturas/
   * assinaturas (fiscal) e os registros de aceite (prova de consentimento).
   * Respeita o isolamento multi-tenant (RLS) e os filtros explícitos por company.
   */
  deleteAccount(data: { requesterUserId: string; companyId: string; scope: DataSubjectScope }): Promise<void>;
}
