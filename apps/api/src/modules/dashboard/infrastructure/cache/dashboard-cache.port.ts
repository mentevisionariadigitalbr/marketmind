/**
 * Porta de cache do dashboard. Implementações: in-memory (default, sempre
 * disponível) e Redis (quando há REDIS_URL). O serviço não conhece a infra.
 */
export interface DashboardCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  /** Invalida por prefixo (ex.: ao importar pedidos de um tenant). */
  invalidatePrefix(prefix: string): Promise<void>;
}
