import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  companyId: string;
  userId: string;
  role: string;
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
