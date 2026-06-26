import { roiOnCost, roiOnPurchase, prospectiveMarginPct, isLowProfitability } from './roi';

describe('roiOnCost', () => {
  it('lucro sobre custo', () => {
    expect(roiOnCost(200, 100)).toBe(1); // 100% de retorno
    expect(roiOnCost(150, 100)).toBeCloseTo(0.5, 5);
  });
  it('custo zero/negativo → 0', () => {
    expect(roiOnCost(200, 0)).toBe(0);
    expect(roiOnCost(200, -10)).toBe(0);
  });
  it('prejuízo → ROI negativo', () => {
    expect(roiOnCost(80, 100)).toBeCloseTo(-0.2, 5);
  });
});

describe('roiOnPurchase', () => {
  it('lucro gerado sobre valor comprado', () => {
    expect(roiOnPurchase(500, 1000)).toBe(0.5);
  });
  it('nada comprado → 0', () => {
    expect(roiOnPurchase(500, 0)).toBe(0);
  });
});

describe('prospectiveMarginPct', () => {
  it('margem sobre o preço efetivo', () => {
    expect(prospectiveMarginPct(100, 60)).toBeCloseTo(0.4, 5);
  });
  it('preço efetivo menor que o custo → margem negativa (prejuízo)', () => {
    expect(prospectiveMarginPct(50, 60)).toBeCloseTo(-0.2, 5);
  });
  it('preço zero → 0', () => {
    expect(prospectiveMarginPct(0, 60)).toBe(0);
  });
});

describe('isLowProfitability', () => {
  it('margem abaixo do limite (default 10%) → true', () => {
    expect(isLowProfitability(1000, 50)).toBe(true); // 5%
  });
  it('margem negativa → true', () => {
    expect(isLowProfitability(1000, -100)).toBe(true);
  });
  it('margem saudável → false', () => {
    expect(isLowProfitability(1000, 300)).toBe(false); // 30%
  });
  it('sem receita → false (não sinaliza)', () => {
    expect(isLowProfitability(0, 0)).toBe(false);
  });
});
