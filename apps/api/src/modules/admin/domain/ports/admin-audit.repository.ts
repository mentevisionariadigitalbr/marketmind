export const ADMIN_AUDIT_REPOSITORY = Symbol('AdminAuditRepository');

export interface AuditLogView {
  id: string;
  createdAt: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  userId: string | null;
  companyId: string | null;
  ip: string | null;
}

export interface AuditLogPage {
  items: AuditLogView[];
  total: number;
  page: number;
  pageSize: number;
}

/** Trilha de auditoria (cross-tenant) para o backoffice. */
export interface AdminAuditRepository {
  list(params: { page: number; pageSize: number; action?: string }): Promise<AuditLogPage>;
}
