import type { DashboardCache } from './dashboard-cache.port';

interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * Cache em processo com TTL. Default quando não há Redis — garante que o
 * dashboard funcione (degradação graciosa) sem dependência externa.
 */
export class InMemoryDashboardCache implements DashboardCache {
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}
