export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" está aberto.`);
    this.name = 'CircuitOpenError';
  }
}

export interface CircuitBreakerOptions {
  name?: string;
  /** Falhas consecutivas para abrir. Default: 5. */
  failureThreshold?: number;
  /** Tempo aberto antes de testar (HALF_OPEN). Default: 30s. */
  cooldownMs?: number;
  now?: () => number;
}

/**
 * Circuit breaker para APIs externas (Mercado Livre). Evita cascata de falhas:
 * CLOSED -> (N falhas) -> OPEN -> (cooldown) -> HALF_OPEN -> (sucesso) -> CLOSED.
 */
export class CircuitBreaker {
  private state: BreakerState = 'CLOSED';
  private failures = 0;
  private openedAt = 0;

  private readonly name: string;
  private readonly threshold: number;
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.name = opts.name ?? 'external';
    this.threshold = opts.failureThreshold ?? 5;
    this.cooldownMs = opts.cooldownMs ?? 30_000;
    this.now = opts.now ?? (() => Date.now());
  }

  getState(): BreakerState {
    this.maybeHalfOpen();
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.maybeHalfOpen();
    if (this.state === 'OPEN') {
      throw new CircuitOpenError(this.name);
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private maybeHalfOpen(): void {
    if (this.state === 'OPEN' && this.now() - this.openedAt >= this.cooldownMs) {
      this.state = 'HALF_OPEN';
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures += 1;
    if (this.state === 'HALF_OPEN' || this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.openedAt = this.now();
    }
  }
}
