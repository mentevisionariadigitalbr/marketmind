import { PlanRow, SubscriptionRow } from '../saas-metrics';

export const ADMIN_METRICS_REPOSITORY = Symbol('AdminMetricsRepository');

/**
 * Leitura CROSS-TENANT (sem contexto de tenant → RLS aberta) das assinaturas e
 * planos de todas as empresas, para as métricas de negócio do backoffice.
 */
export interface AdminMetricsRepository {
  loadSubscriptions(): Promise<SubscriptionRow[]>;
  loadPlans(): Promise<PlanRow[]>;
}
