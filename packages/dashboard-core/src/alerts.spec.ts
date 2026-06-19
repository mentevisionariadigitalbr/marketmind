import { detectAlerts, DEFAULT_ALERT_RULES } from './alerts';
import type { ProductSignal } from './ports';

function signal(over: Partial<ProductSignal>): ProductSignal {
  return {
    productId: 'p1',
    sku: 'SKU1',
    title: 'Produto',
    stock: 10,
    status: 'active',
    unitsSoldCurrent: 10,
    unitsSoldPrevious: 10,
    marginPct: 0.3,
    ...over,
  };
}

describe('detectAlerts', () => {
  it('produto ativo sem estoque → critical out-of-stock', () => {
    const [a] = detectAlerts([signal({ stock: 0 })]);
    expect(a.type).toBe('out-of-stock');
    expect(a.severity).toBe('critical');
  });

  it('estoque baixo (<= threshold) → warning low-stock', () => {
    const alerts = detectAlerts([signal({ stock: 3 })]);
    expect(alerts.find((a) => a.type === 'low-stock')?.severity).toBe('warning');
  });

  it('produto inativo sem estoque não alerta', () => {
    const alerts = detectAlerts([signal({ stock: 0, status: 'closed' })]);
    expect(alerts).toHaveLength(0);
  });

  it('produto parado (com estoque, zero vendas) → info', () => {
    const alerts = detectAlerts([
      signal({ stock: 5, unitsSoldCurrent: 0, unitsSoldPrevious: 0 }),
    ]);
    // estoque 5 também gera low-stock (<=5); garantimos que stale também aparece
    expect(alerts.some((a) => a.type === 'stale-product')).toBe(true);
  });

  it('margem negativa → critical', () => {
    const [a] = detectAlerts([signal({ marginPct: -0.1 })]);
    expect(a.type).toBe('negative-margin');
  });

  it('margem null (sem custo) não gera alerta de margem', () => {
    const alerts = detectAlerts([signal({ marginPct: null })]);
    expect(alerts.some((a) => a.type === 'negative-margin')).toBe(false);
  });

  it('queda de vendas >= salesDropPct → sales-drop', () => {
    const alerts = detectAlerts([signal({ unitsSoldPrevious: 100, unitsSoldCurrent: 40 })]);
    expect(alerts.some((a) => a.type === 'sales-drop')).toBe(true);
  });

  it('explosão de vendas >= salesSpikePct → sales-spike', () => {
    const alerts = detectAlerts([signal({ unitsSoldPrevious: 10, unitsSoldCurrent: 30 })]);
    expect(alerts.some((a) => a.type === 'sales-spike')).toBe(true);
  });

  it('sem base anterior não dispara variação de vendas', () => {
    const alerts = detectAlerts([signal({ unitsSoldPrevious: 0, unitsSoldCurrent: 50, stock: 10 })]);
    expect(alerts.some((a) => a.type === 'sales-drop' || a.type === 'sales-spike')).toBe(false);
  });

  it('ordena por severidade (critical antes de info)', () => {
    const alerts = detectAlerts([
      signal({ productId: 'a', stock: 5, unitsSoldCurrent: 0, unitsSoldPrevious: 0 }), // info/warning
      signal({ productId: 'b', stock: 0 }), // critical
    ]);
    expect(alerts[0].severity).toBe('critical');
  });

  it('expõe regras default', () => {
    expect(DEFAULT_ALERT_RULES.lowStockThreshold).toBe(5);
  });
});
