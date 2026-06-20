import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { RedisThrottlerStorage } from '../src/shared/throttler/redis-throttler.storage';

/**
 * Integration test (Sprint 4.0): o rate limiting em Redis é COMPARTILHADO entre
 * instâncias. Duas RedisThrottlerStorage apontando para o mesmo Redis simulam
 * duas réplicas (Railway/Upstash) e o limite é contado em conjunto.
 * Requer Redis real (REDIS_URL ou localhost:6379).
 */
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6380';

describe('RedisThrottlerStorage (integration)', () => {
  let r1: Redis;
  let r2: Redis;
  let s1: RedisThrottlerStorage;
  let s2: RedisThrottlerStorage;
  const TTL = 10_000;
  const BLOCK = 10_000;
  const LIMIT = 5;

  beforeAll(() => {
    r1 = new Redis(REDIS_URL);
    r2 = new Redis(REDIS_URL);
    s1 = new RedisThrottlerStorage(r1);
    s2 = new RedisThrottlerStorage(r2);
  });

  afterAll(async () => {
    await r1?.quit();
    await r2?.quit();
  });

  it('conta o limite em conjunto entre duas instâncias (multi-instância)', async () => {
    const key = `it-${randomUUID()}`;
    const records = [];
    for (let i = 0; i < 6; i++) {
      const storage = i % 2 === 0 ? s1 : s2; // alterna entre "réplicas"
      records.push(await storage.increment(key, TTL, LIMIT, BLOCK, 'itest'));
    }
    // Hits acumulam globalmente, mesmo alternando de instância.
    expect(records.map((r) => r.totalHits)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(records[4].isBlocked).toBe(false); // 5º hit = no limite
    expect(records[5].isBlocked).toBe(true); // 6º hit = bloqueado (compartilhado)

    await r1.del(`throttle:itest:${key}`, `throttle:block:itest:${key}`);
  });

  it('chaves diferentes são independentes', async () => {
    const a = await s1.increment(`a-${randomUUID()}`, TTL, LIMIT, BLOCK, 'itest');
    const b = await s2.increment(`b-${randomUUID()}`, TTL, LIMIT, BLOCK, 'itest');
    expect(a.totalHits).toBe(1);
    expect(b.totalHits).toBe(1);
  });

  it('expira a janela (TTL) — devolve timeToExpire em segundos', async () => {
    const rec = await s1.increment(`ttl-${randomUUID()}`, TTL, LIMIT, BLOCK, 'itest');
    expect(rec.timeToExpire).toBeGreaterThan(0);
    expect(rec.timeToExpire).toBeLessThanOrEqual(TTL / 1000);
  });

  it('fail-open: Redis indisponível NÃO bloqueia (degrada para sem-limite)', async () => {
    const bad = new Redis(6390, '127.0.0.1', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    bad.on('error', () => undefined);
    const sBad = new RedisThrottlerStorage(bad);
    const rec = await sBad.increment('x', 1000, 1, 1000, 'itest');
    expect(rec.isBlocked).toBe(false);
    expect(rec.totalHits).toBe(1);
    bad.disconnect();
  });
});
