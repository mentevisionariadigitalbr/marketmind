import { RETRY_DELAYS_MS, MAX_ATTEMPTS, backoffForAttempt, isFinalAttempt } from './retry';

describe('retry policy', () => {
  it('tem 5 tentativas com a escala definida', () => {
    expect(MAX_ATTEMPTS).toBe(5);
    expect(RETRY_DELAYS_MS).toEqual([0, 30_000, 120_000, 600_000, 1_800_000]);
  });

  it('backoffForAttempt mapeia a tentativa para o atraso da próxima', () => {
    expect(backoffForAttempt(1)).toBe(30_000); // antes da 2ª
    expect(backoffForAttempt(2)).toBe(120_000); // antes da 3ª
    expect(backoffForAttempt(3)).toBe(600_000);
    expect(backoffForAttempt(4)).toBe(1_800_000);
  });

  it('satura no último atraso e trata limites', () => {
    expect(backoffForAttempt(99)).toBe(1_800_000);
    expect(backoffForAttempt(0)).toBe(0);
  });

  it('isFinalAttempt detecta a última tentativa', () => {
    expect(isFinalAttempt(4)).toBe(false);
    expect(isFinalAttempt(5)).toBe(true);
    expect(isFinalAttempt(2, 2)).toBe(true);
  });
});
