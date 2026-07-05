import { Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';

/**
 * Storage de rate limiting em Redis (Sprint 4.0). Compartilhado entre instâncias
 * → o limite é global no cluster (Railway/Upstash), não por processo.
 *
 * Atomicidade via um único script Lua (INCR + PEXPIRE + bloqueio) — sem corrida
 * entre réplicas concorrentes. ttl/blockDuration em milissegundos (contrato v6).
 */
const SCRIPT = `
local hits = redis.call("INCR", KEYS[1])
local ttlMs = redis.call("PTTL", KEYS[1])
if ttlMs <= 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttlMs = tonumber(ARGV[1])
end
local blocked = redis.call("GET", KEYS[2])
local blockMs = 0
if blocked == false then
  if hits > tonumber(ARGV[2]) then
    redis.call("SET", KEYS[2], "1", "PX", ARGV[3])
    blocked = "1"
    blockMs = tonumber(ARGV[3])
  end
else
  blockMs = redis.call("PTTL", KEYS[2])
end
return { hits, ttlMs, (blocked ~= false) and 1 or 0, blockMs }
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger('RedisThrottlerStorage');

  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const counterKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:block:${throttlerName}:${key}`;
    try {
      const [hits, ttlMs, blocked, blockMs] = (await this.redis.eval(
        SCRIPT,
        2,
        counterKey,
        blockKey,
        ttl,
        limit,
        blockDuration,
      )) as [number, number, number, number];

      return {
        totalHits: hits,
        timeToExpire: Math.ceil(ttlMs / 1000),
        isBlocked: blocked === 1,
        timeToBlockExpire: Math.ceil(blockMs / 1000),
      };
    } catch (err) {
      // Fail-open: indisponibilidade do Redis NÃO derruba a API (degrada para
      // "sem limite") em vez de bloquear/500. Limite volta quando o Redis voltar.
      this.logger.warn(`Redis indisponível no rate limiting — fail-open: ${(err as Error).message}`);
      return { totalHits: 1, timeToExpire: Math.ceil(ttl / 1000), isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
