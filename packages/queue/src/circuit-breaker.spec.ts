import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('abre após o limite de falhas e bloqueia chamadas', async () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 1000, now: () => now });
    const boom = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(boom)).rejects.toThrow('fail');
    }
    expect(breaker.getState()).toBe('OPEN');

    // Com o circuito aberto, nem chama a função.
    await expect(breaker.execute(() => Promise.resolve('x'))).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it('vai a HALF_OPEN após o cooldown e fecha no sucesso', async () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000, now: () => now });

    await expect(breaker.execute(() => Promise.reject(new Error('x')))).rejects.toThrow();
    expect(breaker.getState()).toBe('OPEN');

    now = 1000; // passou o cooldown
    expect(breaker.getState()).toBe('HALF_OPEN');

    await expect(breaker.execute(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('reabre se a chamada de teste (HALF_OPEN) falhar', async () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 1000, now: () => now });
    await expect(breaker.execute(() => Promise.reject(new Error('x')))).rejects.toThrow();
    now = 1000;
    await expect(breaker.execute(() => Promise.reject(new Error('again')))).rejects.toThrow('again');
    expect(breaker.getState()).toBe('OPEN');
  });
});
