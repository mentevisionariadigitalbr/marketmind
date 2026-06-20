import { unitCost, selectActiveCost, costCoverage, type CostCandidate } from './costs';

const comp = { acquisitionCost: 10, inboundFreight: 2, packagingCost: 1, otherCost: 0.5 };

describe('unitCost', () => {
  it('soma os quatro componentes', () => {
    expect(unitCost(comp)).toBeCloseTo(13.5);
  });
});

describe('selectActiveCost (custo vigente por data)', () => {
  const product = (validFrom: string): CostCandidate => ({ ...comp, level: 'product', validFrom: new Date(validFrom) });
  const variant = (validFrom: string): CostCandidate => ({ ...comp, level: 'variant', validFrom: new Date(validFrom) });

  it('pega o validFrom mais recente que já está vigente na data', () => {
    const chosen = selectActiveCost(
      [product('2026-01-01'), product('2026-03-01'), product('2026-06-01')],
      new Date('2026-04-15'),
    );
    expect(chosen?.validFrom.toISOString().slice(0, 10)).toBe('2026-03-01'); // 06-01 ainda não vigente
  });

  it('custo futuro retroage como fallback quando não há vigente', () => {
    const chosen = selectActiveCost([product('2026-09-01')], new Date('2026-06-15'));
    expect(chosen?.validFrom.toISOString().slice(0, 10)).toBe('2026-09-01');
  });

  it('vigente tem prioridade sobre futuro', () => {
    const chosen = selectActiveCost([product('2026-09-01'), product('2026-03-01')], new Date('2026-06-15'));
    expect(chosen?.validFrom.toISOString().slice(0, 10)).toBe('2026-03-01'); // vigente
  });

  it('entre dois futuros, o mais antigo (menor validFrom)', () => {
    const chosen = selectActiveCost([product('2026-10-01'), product('2026-08-01')], new Date('2026-06-15'));
    expect(chosen?.validFrom.toISOString().slice(0, 10)).toBe('2026-08-01');
  });

  it('variante tem prioridade sobre produto na mesma data', () => {
    const chosen = selectActiveCost([product('2026-01-01'), variant('2026-01-01')], new Date('2026-06-15'));
    expect(chosen?.level).toBe('variant');
  });

  it('custo histórico: data no passado usa o custo que valia então', () => {
    const chosen = selectActiveCost(
      [product('2026-01-01'), product('2026-05-01')],
      new Date('2026-02-10'),
    );
    expect(chosen?.validFrom.toISOString().slice(0, 10)).toBe('2026-01-01');
  });

  it('sem candidatos → null (cobertura faltante, nunca custo 0)', () => {
    expect(selectActiveCost([], new Date())).toBeNull();
  });

  it('não muta o array de entrada', () => {
    const input = [product('2026-01-01'), product('2026-03-01')];
    const snapshot = [...input];
    selectActiveCost(input, new Date('2026-06-15'));
    expect(input).toEqual(snapshot);
  });
});

describe('costCoverage', () => {
  it('fração coberta = coberto / total', () => {
    expect(costCoverage(800, 1000)).toBeCloseTo(0.8);
  });
  it('total 0 → 0 (sem divisão por zero)', () => {
    expect(costCoverage(0, 0)).toBe(0);
  });
  it('cobertura total → 1', () => {
    expect(costCoverage(1000, 1000)).toBe(1);
  });
});
