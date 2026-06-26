import { detectAlerts } from './alerts';
import type { ProductSignal } from './ports';

function signal(p: Partial<ProductSignal>): ProductSignal {
  return {
    productId: 'p1',
    sku: 'S1',
    title: 'Produto',
    stock: 0,
    status: 'active',
    unitsSoldCurrent: 0,
    unitsSoldPrevious: 0,
    marginPct: null,
    ...p,
  };
}

const types = (signals: ProductSignal[]) => detectAlerts(signals).map((a) => a.type);

describe('detectAlerts — inteligência+ (Fase 2, Inc.4)', () => {
  it('excesso de estoque: cobertura > 120 dias (capital parado)', () => {
    // velocidade = 10/30 ≈ 0,33/dia → cobertura = 400/0,33 ≈ 1200 dias
    const s = signal({ stock: 400, unitsSoldCurrent: 10, unitCost: 5 });
    const alerts = detectAlerts([s]);
    const excess = alerts.find((a) => a.type === 'excess-stock');
    expect(excess).toBeDefined();
    expect(excess!.value).toBe(2000); // 400 × 5 de capital parado
  });

  it('comprar hoje: cobertura <= lead time do fornecedor', () => {
    // velocidade = 30/30 = 1/dia → cobertura = 10 dias <= lead time 15
    const s = signal({ stock: 10, unitsSoldCurrent: 30, leadTimeDays: 15 });
    expect(types([s])).toContain('buy-now');
  });

  it('promoção com prejuízo: preço promocional abaixo do custo', () => {
    const s = signal({ stock: 50, unitsSoldCurrent: 5, promoPrice: 40, unitCost: 50 });
    const alerts = detectAlerts([s]);
    const promo = alerts.find((a) => a.type === 'promo-loss');
    expect(promo).toBeDefined();
    expect(promo!.severity).toBe('critical');
    expect(promo!.value).toBe(-10);
  });

  it('não dispara os novos alertas sem os dados (compatível com sinais antigos)', () => {
    // cobertura = 10/(5/30) = 60 dias (≤ 120) → sem excesso; sem leadTime/promo
    const s = signal({ stock: 10, unitsSoldCurrent: 5 });
    const t = types([s]);
    expect(t).not.toContain('excess-stock');
    expect(t).not.toContain('buy-now');
    expect(t).not.toContain('promo-loss');
  });
});
