/**
 * DRE — Demonstrativo de Resultado (Fase 2). Builder PURO: a mesma função
 * alimenta o endpoint /finance/dre e o KPI `profit.net` do Overview, garantindo
 * que o lucro líquido do DRE bate com o do dashboard.
 *
 * Cascata: Receita bruta − (comissão + frete + imposto) = Receita líquida
 *          − CMV = Lucro bruto − Despesas operacionais = Lucro líquido.
 */

export interface DreInput {
  readonly grossRevenue: number;
  readonly commission: number;
  readonly freight: number;
  readonly taxes: number;
  readonly cogs: number;
  readonly operatingExpenses: number;
}

export interface DreDeductions {
  readonly commission: number;
  readonly freight: number;
  readonly taxes: number;
  readonly total: number;
}

export interface Dre {
  readonly grossRevenue: number;
  readonly deductions: DreDeductions;
  readonly netRevenue: number;
  readonly cogs: number;
  readonly grossProfit: number;
  readonly operatingExpenses: number;
  readonly netProfit: number;
  /** Lucro líquido / receita bruta (fração 0..1). */
  readonly netMarginPct: number;
}

export function buildDre(i: DreInput): Dre {
  const total = i.commission + i.freight + i.taxes;
  const netRevenue = i.grossRevenue - total;
  const grossProfit = netRevenue - i.cogs;
  const netProfit = grossProfit - i.operatingExpenses;
  return {
    grossRevenue: i.grossRevenue,
    deductions: { commission: i.commission, freight: i.freight, taxes: i.taxes, total },
    netRevenue,
    cogs: i.cogs,
    grossProfit,
    operatingExpenses: i.operatingExpenses,
    netProfit,
    netMarginPct: i.grossRevenue > 0 ? netProfit / i.grossRevenue : 0,
  };
}
