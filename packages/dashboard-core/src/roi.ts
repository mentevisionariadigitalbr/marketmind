/**
 * ROI e margem prospectiva (Fase 2, Inc.2) — domínio puro.
 *
 * - ROI por produto = lucro ÷ COGS (eficiência da margem sobre o custo vendido).
 * - ROI por fornecedor = lucro gerado ÷ valor comprado (retorno do sourcing).
 * - Margem prospectiva usa o PREÇO EFETIVO (promo ?? cheio), não o histórico.
 */

/** ROI sobre custo = (receita − custo) / custo. Ratio (1 = 100%). 0 quando custo ≤ 0. */
export function roiOnCost(revenue: number, cost: number): number {
  if (!(cost > 0)) return 0;
  return (revenue - cost) / cost;
}

/** ROI do fornecedor = lucro gerado / valor comprado. 0 quando nada foi comprado. */
export function roiOnPurchase(profit: number, purchased: number): number {
  if (!(purchased > 0)) return 0;
  return profit / purchased;
}

/** Margem prospectiva (%): (preço efetivo − custo) / preço efetivo. Ratio. */
export function prospectiveMarginPct(effectivePrice: number, unitCost: number): number {
  if (!(effectivePrice > 0)) return 0;
  return (effectivePrice - unitCost) / effectivePrice;
}

/**
 * Fornecedor com baixa rentabilidade: tem vendas mas a margem (lucro/receita) fica
 * abaixo do limite (default 10%) — inclui margem negativa. Sem vendas → não sinaliza.
 */
export function isLowProfitability(revenue: number, profit: number, marginThreshold = 0.1): boolean {
  if (!(revenue > 0)) return false;
  return profit / revenue < marginThreshold;
}
