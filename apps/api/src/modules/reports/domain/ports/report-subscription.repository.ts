import type { ReportFrequency } from '../../application/digest';

export const REPORT_SUBSCRIPTION_REPOSITORY = Symbol('ReportSubscriptionRepository');

export interface ReportSubscription {
  frequency: ReportFrequency;
  recipients: string;
  enabled: boolean;
  lastSentAt: string | null;
}

export interface UpsertSubscriptionData {
  frequency: ReportFrequency;
  recipients: string;
  enabled: boolean;
}

export interface DueSubscription {
  companyId: string;
  frequency: ReportFrequency;
  recipients: string;
  lastSentAt: Date | null;
}

export interface ReportSubscriptionRepository {
  getByCompany(): Promise<ReportSubscription | null>;
  upsert(data: UpsertSubscriptionData): Promise<void>;
  /** Marca como enviado agora (tenant-scoped). */
  markSent(now: Date): Promise<void>;
  /** Todas as assinaturas habilitadas (cross-tenant, para o agendador). */
  listEnabled(): Promise<DueSubscription[]>;
}
