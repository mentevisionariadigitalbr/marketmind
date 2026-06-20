import { effectiveRate, computeTax, DEFAULT_REGIME_RATE, type TaxRule } from './tax';

describe('effectiveRate', () => {
  it('usa o default do regime quando não há regra', () => {
    expect(effectiveRate('SIMPLES_NACIONAL', 'MLB1', [])).toBeCloseTo(DEFAULT_REGIME_RATE.SIMPLES_NACIONAL);
  });

  it('regra padrão do regime (category null) sobrepõe o default', () => {
    const rules: TaxRule[] = [{ category: null, rate: 0.08 }];
    expect(effectiveRate('SIMPLES_NACIONAL', 'MLB1', rules)).toBeCloseTo(0.08);
  });

  it('regra por categoria tem prioridade sobre a padrão', () => {
    const rules: TaxRule[] = [
      { category: null, rate: 0.08 },
      { category: 'MLB-ELETRO', rate: 0.12 },
    ];
    expect(effectiveRate('SIMPLES_NACIONAL', 'MLB-ELETRO', rules)).toBeCloseTo(0.12);
    expect(effectiveRate('SIMPLES_NACIONAL', 'MLB-OUTRO', rules)).toBeCloseTo(0.08); // fallback padrão
  });

  it('categoria null cai direto no padrão/default (ignora regras por categoria)', () => {
    const rules: TaxRule[] = [{ category: 'MLB-X', rate: 0.2 }];
    expect(effectiveRate('LUCRO_PRESUMIDO', null, rules)).toBeCloseTo(DEFAULT_REGIME_RATE.LUCRO_PRESUMIDO);
  });
});

describe('computeTax', () => {
  it('soma imposto por categoria com alíquotas distintas', () => {
    const rules: TaxRule[] = [
      { category: null, rate: 0.06 },
      { category: 'A', rate: 0.1 },
    ];
    const r = computeTax(
      [
        { category: 'A', revenue: 1000 }, // 100
        { category: 'B', revenue: 1000 }, // 60 (default)
      ],
      'SIMPLES_NACIONAL',
      rules,
    );
    expect(r.tax).toBeCloseTo(160);
    expect(r.effectiveRatePct).toBeCloseTo(0.08); // 160/2000
  });

  it('trocar o regime muda o imposto (sem regras → default)', () => {
    const rev = [{ category: null, revenue: 1000 }];
    expect(computeTax(rev, 'SIMPLES_NACIONAL', []).tax).toBeCloseTo(60);
    expect(computeTax(rev, 'LUCRO_PRESUMIDO', []).tax).toBeCloseTo(113.3);
  });

  it('receita 0 → imposto 0 e alíquota 0', () => {
    expect(computeTax([], 'SIMPLES_NACIONAL', [])).toEqual({ tax: 0, effectiveRatePct: 0 });
  });
});
