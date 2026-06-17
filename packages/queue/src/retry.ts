/**
 * Política de retry (ADR-0003 / Sprint 2.5):
 *   tentativa 1: imediata
 *   tentativa 2: +30s
 *   tentativa 3: +2min
 *   tentativa 4: +10min
 *   tentativa 5: +30min
 * Após a 5ª falha => Dead Letter Queue.
 */
export const RETRY_DELAYS_MS: readonly number[] = [0, 30_000, 120_000, 600_000, 1_800_000];

export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

/**
 * Delay (ms) antes da PRÓXIMA tentativa, dado o número de tentativas já feitas.
 * `attemptsMade = 1` => atraso antes da tentativa 2 (30s).
 */
export function backoffForAttempt(attemptsMade: number): number {
  if (attemptsMade < 1) return RETRY_DELAYS_MS[0];
  return RETRY_DELAYS_MS[attemptsMade] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
}

/** Verdadeiro quando não há mais tentativas — o job deve ir para a DLQ. */
export function isFinalAttempt(attemptsMade: number, maxAttempts: number = MAX_ATTEMPTS): boolean {
  return attemptsMade >= maxAttempts;
}
