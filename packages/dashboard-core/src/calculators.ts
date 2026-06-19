/**
 * Calculadoras puras de KPI. Funções totais e determinísticas — sem I/O, sem
 * Date.now, sem dependências. Toda divisão por zero é tratada (retorna 0).
 * São a "verdade" das fórmulas; API e Worker apenas alimentam os números.
 */

/** Protege divisões: denominador <= 0 → 0. */
function safeDiv(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

/** Ticket médio = receita / nº de pedidos. */
export function averageTicket(revenue: number, orders: number): number {
  return safeDiv(revenue, orders);
}

/** Taxa de crescimento (fração: 0.1 = +10%) entre período atual e anterior. */
export function growthRate(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 1;
  return safeDiv(current - previous, Math.abs(previous));
}

/** Margem de contribuição (%): (receita − comissão − frete) / receita. */
export function contributionMarginPct(revenue: number, commission: number, freight: number): number {
  return safeDiv(revenue - commission - freight, revenue);
}

/** Lucro bruto = receita − COGS. */
export function grossProfit(revenue: number, cogs: number): number {
  return revenue - cogs;
}

/** Margem bruta (%): (receita − COGS) / receita. */
export function grossMarginPct(revenue: number, cogs: number): number {
  return safeDiv(revenue - cogs, revenue);
}

/** Lucro líquido = receita − COGS − despesas − impostos. */
export function netProfit(revenue: number, cogs: number, expenses: number, taxes: number): number {
  return revenue - cogs - expenses - taxes;
}

/** Margem líquida (%): lucro líquido / receita. */
export function netMarginPct(revenue: number, cogs: number, expenses: number, taxes: number): number {
  return safeDiv(netProfit(revenue, cogs, expenses, taxes), revenue);
}

/** Giro de estoque = unidades vendidas (ou COGS) / estoque médio. */
export function inventoryTurnover(soldOrCogs: number, averageInventory: number): number {
  return safeDiv(soldOrCogs, averageInventory);
}

/** Dias de cobertura = estoque atual / venda diária média. */
export function stockCoverageDays(onHand: number, averageDailySales: number): number {
  return safeDiv(onHand, averageDailySales);
}

/** Velocidade de vendas = unidades vendidas / dias do período. */
export function salesVelocity(unitsSold: number, days: number): number {
  return safeDiv(unitsSold, days);
}

/** AOV (ticket por cliente) = receita / nº de clientes distintos. */
export function customerAov(revenue: number, distinctCustomers: number): number {
  return safeDiv(revenue, distinctCustomers);
}

/** Frequência de compra = pedidos / clientes distintos. */
export function customerFrequency(orders: number, distinctCustomers: number): number {
  return safeDiv(orders, distinctCustomers);
}

/**
 * LTV = AOV × frequência × margem de contribuição × tempo de vida (períodos).
 * Modelo simples e auditável; refina-se com churn quando houver histórico.
 */
export function customerLtv(
  aov: number,
  frequency: number,
  contributionMargin: number,
  lifespanPeriods = 1,
): number {
  return aov * frequency * contributionMargin * lifespanPeriods;
}
