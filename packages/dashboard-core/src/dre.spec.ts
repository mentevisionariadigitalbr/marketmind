import { buildDre } from './dre';

describe('buildDre', () => {
  const input = { grossRevenue: 1000, commission: 100, freight: 50, taxes: 60, cogs: 400, operatingExpenses: 200 };

  it('monta a cascata do DRE', () => {
    const dre = buildDre(input);
    expect(dre.deductions.total).toBe(210); // 100 + 50 + 60
    expect(dre.netRevenue).toBe(790); // 1000 - 210
    expect(dre.grossProfit).toBe(390); // 790 - 400
    expect(dre.netProfit).toBe(190); // 390 - 200
    expect(dre.netMarginPct).toBeCloseTo(0.19); // 190 / 1000
  });

  it('lucro líquido = receita − comissão − frete − imposto − CMV − despesas', () => {
    const dre = buildDre(input);
    expect(dre.netProfit).toBe(1000 - 100 - 50 - 60 - 400 - 200);
  });

  it('imposto maior reduz o lucro líquido', () => {
    const a = buildDre(input);
    const b = buildDre({ ...input, taxes: 160 });
    expect(b.netProfit).toBe(a.netProfit - 100);
  });

  it('receita 0 → margem 0 (sem divisão por zero)', () => {
    expect(buildDre({ grossRevenue: 0, commission: 0, freight: 0, taxes: 0, cogs: 0, operatingExpenses: 0 }).netMarginPct).toBe(0);
  });
});
