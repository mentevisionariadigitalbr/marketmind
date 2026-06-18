import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto propagado por toda a cadeia (API → fila → worker → banco):
 * tenant + correlação. Base do RLS e do tracing distribuído.
 */
export interface TenantContext {
  companyId: string;
  userId: string;
  role: string;
  /** Correlaciona uma operação ponta a ponta (request → jobs derivados). */
  correlationId?: string;
  /** Id da requisição HTTP de origem. */
  requestId?: string;
  /** Trace distribuído (OpenTelemetry). */
  traceId?: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTenant(): TenantContext | undefined {
  return storage.getStore();
}

export function requireTenant(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error('Tenant context ausente — requisição não autenticada?');
  }
  return ctx;
}
