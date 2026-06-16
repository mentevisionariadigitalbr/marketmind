export const AUDIT_LOG_REPOSITORY = Symbol('AuditLogRepository');

export interface AuditLogEntry {
  companyId: string | null;
  userId: string | null;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogRepository {
  record(entry: AuditLogEntry): Promise<void>;
}
