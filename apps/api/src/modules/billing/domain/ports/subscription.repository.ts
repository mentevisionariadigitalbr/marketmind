export const SUBSCRIPTION_REPOSITORY = Symbol('SubscriptionRepository');

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';

export interface SubscriptionRecord {
  id: string;
  companyId: string;
  planId: string;
  planCode: string;
  status: SubscriptionStatus;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface CreateTrialData {
  planId: string;
  trialStartedAt: Date;
  trialEndsAt: Date;
}

export interface SubscriptionRepository {
  /** Assinatura do tenant corrente (RLS). Null se ainda não provisionada. */
  findForCurrentCompany(): Promise<SubscriptionRecord | null>;
  /**
   * Cria a assinatura de trial para a empresa, se ainda não existir, e devolve a
   * vigente. Idempotente sob concorrência (unique em company_id).
   */
  createTrialIfAbsent(data: CreateTrialData): Promise<SubscriptionRecord>;
  /** Vincula o customer do provedor à assinatura do tenant corrente. */
  setProviderCustomer(data: { provider: string; customerId: string }): Promise<void>;
}
