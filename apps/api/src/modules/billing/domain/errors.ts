import { ApplicationError } from '@marketmind/kernel';

/** Limite do plano atingido (ex.: nº de contas/produtos). Mapeado para HTTP 402. */
export class PlanLimitExceededError extends ApplicationError {
  constructor(
    public readonly metric: string,
    public readonly limit: number,
  ) {
    super(
      'PLAN_LIMIT_EXCEEDED',
      `Limite do plano atingido para "${metric}" (máx. ${limit}). Faça upgrade para continuar.`,
    );
  }
}

/** Acesso bloqueado: trial expirado ou assinatura inadimplente/cancelada (HTTP 402). */
export class SubscriptionRequiredError extends ApplicationError {
  constructor() {
    super('SUBSCRIPTION_REQUIRED', 'Seu período de teste terminou. Assine um plano para continuar.');
  }
}

/** Provedor de pagamento não configurado (sem chave/preço). Mapeado para HTTP 503. */
export class BillingNotConfiguredError extends ApplicationError {
  constructor(detail = 'Pagamento não está configurado no momento.') {
    super('BILLING_NOT_CONFIGURED', detail);
  }
}
