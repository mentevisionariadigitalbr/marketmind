import type Redis from 'ioredis';
import type { DashboardCache } from './dashboard-cache.port';

/**
 * Cache distribuído em Redis. Chaves namespaced por `dash:`; invalidação por
 * prefixo via SCAN (sem KEYS bloqueante). Valores serializados em JSON.
 */
export class RedisDashboardCache implements DashboardCache {
  constructor(private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await this.redis.del(...keys);
    } while (cursor !== '0');
  }
}
