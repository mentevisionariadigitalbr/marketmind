import {
  averageTicket,
  growthRate,
  contributionMarginPct,
  grossProfit,
  grossMarginPct,
  netProfit,
  netMarginPct,
  inventoryTurnover,
  stockCoverageDays,
  salesVelocity,
  customerAov,
  customerFrequency,
  customerLtv,
} from './calculators';

describe('calculators (puros)', () => {
  describe('averageTicket', () => {
    it('divide receita por pedidos', () => {
      expect(averageTicket(1000, 4)).toBe(250);
    });
    it('retorna 0 quando não há pedidos', () => {
      expect(averageTicket(1000, 0)).toBe(0);
    });
  });

  describe('growthRate', () => {
    it('calcula crescimento positivo', () => {
      expect(growthRate(150, 100)).toBeCloseTo(0.5);
    });
    it('calcula queda', () => {
      expect(growthRate(80, 100)).toBeCloseTo(-0.2);
    });
    it('anterior 0 e atual >0 → 100% (1)', () => {
      expect(growthRate(50, 0)).toBe(1);
    });
    it('ambos 0 → 0', () => {
      expect(growthRate(0, 0)).toBe(0);
    });
    it('usa módulo do anterior para base negativa', () => {
      expect(growthRate(-50, -100)).toBeCloseTo(0.5);
    });
  });

  describe('margens', () => {
    it('contribuição = (receita − comissão − frete)/receita', () => {
      expect(contributionMarginPct(1000, 100, 50)).toBeCloseTo(0.85);
    });
    it('lucro bruto = receita − COGS', () => {
      expect(grossProfit(1000, 600)).toBe(400);
    });
    it('margem bruta', () => {
      expect(grossMarginPct(1000, 600)).toBeCloseTo(0.4);
    });
    it('lucro líquido subtrai COGS, despesas e impostos', () => {
      expect(netProfit(1000, 600, 100, 60)).toBe(240);
    });
    it('margem líquida', () => {
      expect(netMarginPct(1000, 600, 100, 60)).toBeCloseTo(0.24);
    });
    it('receita 0 → margem 0 (sem divisão por zero)', () => {
      expect(grossMarginPct(0, 100)).toBe(0);
      expect(contributionMarginPct(0, 10, 5)).toBe(0);
    });
  });

  describe('estoque', () => {
    it('giro = vendido / estoque médio', () => {
      expect(inventoryTurnover(1200, 300)).toBe(4);
    });
    it('cobertura = estoque / venda diária', () => {
      expect(stockCoverageDays(100, 5)).toBe(20);
    });
    it('venda diária 0 → cobertura 0', () => {
      expect(stockCoverageDays(100, 0)).toBe(0);
    });
    it('velocidade = unidades / dias', () => {
      expect(salesVelocity(300, 30)).toBe(10);
    });
  });

  describe('clientes', () => {
    it('AOV = receita / clientes', () => {
      expect(customerAov(2000, 10)).toBe(200);
    });
    it('frequência = pedidos / clientes', () => {
      expect(customerFrequency(30, 10)).toBe(3);
    });
    it('LTV = aov × freq × margem × períodos', () => {
      expect(customerLtv(200, 3, 0.5, 2)).toBe(600);
    });
    it('LTV usa 1 período por padrão', () => {
      expect(customerLtv(200, 3, 0.5)).toBe(300);
    });
  });

  describe('robustez numérica', () => {
    it('NaN/Infinity no denominador → 0', () => {
      expect(averageTicket(100, Number.NaN)).toBe(0);
      expect(inventoryTurnover(100, Number.POSITIVE_INFINITY)).toBe(0);
    });
  });
});
