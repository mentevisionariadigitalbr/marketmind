import { effectivePrice, effectiveText, breakEvenPrice, suggestedPrice, realizedMargin } from './pricing';

describe('effectivePrice', () => {
  it('usa o preço promocional quando válido', () => {
    expect(effectivePrice(100, 80)).toBe(80);
  });
  it('ignora promo nulo/zero/negativo e usa o preço cheio', () => {
    expect(effectivePrice(100, null)).toBe(100);
    expect(effectivePrice(100, 0)).toBe(100);
    expect(effectivePrice(100, -5)).toBe(100);
  });
  it('sem preço → 0', () => {
    expect(effectivePrice(null, null)).toBe(0);
  });
});

describe('effectiveText', () => {
  it('usa o override interno quando preenchido', () => {
    expect(effectiveText('Nome interno', 'Título ML')).toBe('Nome interno');
  });
  it('cai para o valor do marketplace quando vazio', () => {
    expect(effectiveText(null, 'Título ML')).toBe('Título ML');
    expect(effectiveText('   ', 'Título ML')).toBe('Título ML');
  });
});

describe('breakEvenPrice', () => {
  it('cobre custo + frete descontando comissão e imposto', () => {
    // (60 + 10) / (1 − 0,12 − 0,08) = 70 / 0,8 = 87,5
    expect(breakEvenPrice(60, 10, 0.12, 0.08)).toBe(87.5);
  });
  it('null quando taxas >= 100%', () => {
    expect(breakEvenPrice(60, 0, 0.7, 0.3)).toBeNull();
  });
});

describe('suggestedPrice', () => {
  it('atinge a margem-alvo', () => {
    // (60 + 10) / (1 − 0,12 − 0 − 0,28) = 70 / 0,6 = 116,67
    expect(suggestedPrice(60, 10, 0.12, 0, 0.28)).toBeCloseTo(116.67, 2);
  });
  it('null quando a margem-alvo é inviável', () => {
    expect(suggestedPrice(60, 0, 0.5, 0.1, 0.5)).toBeNull();
  });
  it('no preço sugerido, a margem realizada bate com a alvo', () => {
    const p = suggestedPrice(60, 10, 0.12, 0, 0.28)!;
    expect(realizedMargin(p, 60, 10, 0.12, 0)).toBeCloseTo(0.28, 4);
  });
});

describe('realizedMargin', () => {
  it('no break-even a margem é ~0', () => {
    const be = breakEvenPrice(60, 10, 0.12, 0.08)!;
    expect(realizedMargin(be, 60, 10, 0.12, 0.08)).toBeCloseTo(0, 6);
  });
  it('preço abaixo do custo → margem negativa', () => {
    expect(realizedMargin(50, 60, 0, 0.12, 0)).toBeLessThan(0);
  });
});
