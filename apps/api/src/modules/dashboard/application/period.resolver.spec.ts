import { resolvePeriod, previousOf } from './period.resolver';

const NOW = new Date('2026-06-15T12:00:00Z');

describe('resolvePeriod', () => {
  it('7d → janela de 7 dias terminando amanhã (exclusivo)', () => {
    const r = resolvePeriod('7d', { now: NOW });
    expect(r.from.toISOString()).toBe('2026-06-08T00:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-06-16T00:00:00.000Z');
  });

  it('today → início do dia até amanhã', () => {
    const r = resolvePeriod('today', { now: NOW });
    expect(r.from.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('mtd → primeiro dia do mês', () => {
    const r = resolvePeriod('mtd', { now: NOW });
    expect(r.from.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('ytd → primeiro dia do ano', () => {
    const r = resolvePeriod('ytd', { now: NOW });
    expect(r.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('custom respeita from/to', () => {
    const r = resolvePeriod('custom', { from: '2026-01-01', to: '2026-03-01', now: NOW });
    expect(r.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('custom inválido (from >= to) lança', () => {
    expect(() => resolvePeriod('custom', { from: '2026-03-01', to: '2026-01-01' })).toThrow(RangeError);
  });

  it('previousOf devolve janela anterior de mesma duração', () => {
    const r = resolvePeriod('7d', { now: NOW });
    const prev = previousOf(r);
    expect(prev.to).toEqual(r.from);
    expect(r.to.getTime() - r.from.getTime()).toBe(prev.to.getTime() - prev.from.getTime());
  });
});
