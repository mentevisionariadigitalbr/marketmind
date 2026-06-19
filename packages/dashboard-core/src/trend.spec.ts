import { computeTrend } from './trend';
import { previousRange, rangeDays } from './period';

describe('computeTrend', () => {
  it('sobe quando atual > anterior', () => {
    const t = computeTrend(120, 100);
    expect(t.direction).toBe('up');
    expect(t.changePct).toBeCloseTo(0.2);
  });

  it('cai quando atual < anterior', () => {
    expect(computeTrend(80, 100).direction).toBe('down');
  });

  it('estável dentro do flatThreshold', () => {
    expect(computeTrend(1001, 1000).direction).toBe('flat');
  });
});

describe('period helpers', () => {
  it('previousRange devolve janela anterior de mesma duração', () => {
    const range = { from: new Date('2026-06-08'), to: new Date('2026-06-15') };
    const prev = previousRange(range);
    expect(prev.to).toEqual(range.from);
    expect(rangeDays(prev)).toBeCloseTo(7);
  });

  it('rangeDays é 0 para janela invertida/vazia', () => {
    expect(rangeDays({ from: new Date('2026-06-15'), to: new Date('2026-06-15') })).toBe(0);
    expect(rangeDays({ from: new Date('2026-06-16'), to: new Date('2026-06-15') })).toBe(0);
  });
});
