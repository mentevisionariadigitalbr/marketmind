import { SubscriptionStatus } from './subscription.repository';

export const BILLING_SYNC_REPOSITORY = Symbol('BillingSyncRepository');

export interface ActivateSubscriptionData {
  companyId: string;
  planId: string;
  provider: string;
  providerCustomerId: string;
  providerSubscriptionId: string;
}

export interface UpdateSubscriptionData {
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface UpsertInvoiceData {
  companyId: string;
  provider: string;
  providerInvoiceId: string;
  amountCents: number;
  currency: string;
  status: 'PAID' | 'OPEN' | 'FAILED' | 'VOID';
  paymentMethod: string | null;
  hostedUrl: string | null;
  paidAt: Date | null;
}

/**
 * Persistência dirigida por WEBHOOK (sem contexto de tenant — RLS aberta com a GUC
 * vazia, isolamento garantido pelos identificadores do provedor/company explícitos).
 * Mesmo princípio dos fluxos de bootstrap de auth.
 */
export interface BillingSyncRepository {
  /** Idempotência: registra o evento; false se já visto (dedupeKey único). */
  recordEventIfNew(eventId: string, eventType: string, payload: unknown): Promise<boolean>;
  markEventProcessed(eventId: string): Promise<void>;

  /** Ativa a assinatura da empresa (checkout concluído). Idempotente. */
  activateSubscription(data: ActivateSubscriptionData): Promise<void>;
  /** Sincroniza status/período pelo id de assinatura do provedor. */
  updateSubscriptionByProviderId(data: UpdateSubscriptionData): Promise<void>;
  /** Marca a assinatura como cancelada pelo id do provedor. */
  cancelByProviderId(providerSubscriptionId: string): Promise<void>;
  /** Rebaixa para PAST_DUE pelo customer do provedor (falha de pagamento). */
  markPastDueByCustomer(providerCustomerId: string): Promise<void>;

  /** Resolve a empresa dona de um customer do provedor. */
  findCompanyIdByCustomer(providerCustomerId: string): Promise<string | null>;
  /** Cria/atualiza a fatura (idempotente por providerInvoiceId). */
  upsertInvoice(data: UpsertInvoiceData): Promise<void>;
}
