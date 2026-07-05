import { weightedAverageCost } from './costs';

describe('weightedAverageCost', () => {
  it('média ponderada entre estoque atual e a entrada', () => {
    // 10 un a R$10 + 10 un a R$20 → R$15
    expect(weightedAverageCost(10, 10, 10, 20)).toBe(15);
  });

  it('sem estoque prévio → assume o custo da compra', () => {
    expect(weightedAverageCost(0, 0, 5, 33.5)).toBe(33.5);
  });

  it('estoque negativo conta como zero', () => {
    expect(weightedAverageCost(-4, 99, 10, 20)).toBe(20);
  });

  it('arredonda a 2 casas', () => {
    // (3×10 + 1×20)/4 = 12.5
    expect(weightedAverageCost(3, 10, 1, 20)).toBe(12.5);
    // (1×10 + 2×11)/3 = 10.666... → 10.67
    expect(weightedAverageCost(1, 10, 2, 11)).toBe(10.67);
  });
});
