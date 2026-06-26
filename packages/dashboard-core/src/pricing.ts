/**
 * Preço efetivo (Fase 2): o preço realmente praticado para cálculos PROSPECTIVOS
 * (margem/ROI simulados). Usa o preço promocional quando válido (> 0); senão o
 * preço cheio. Não afeta o histórico do DRE, que usa o preço real vendido.
 */
export function effectivePrice(price: number | null | undefined, promoPrice: number | null | undefined): number {
  if (promoPrice != null && promoPrice > 0) return promoPrice;
  return price ?? 0;
}

/** Override interno tem precedência sobre o valor vindo do marketplace (quando preenchido). */
export function effectiveText(internal: string | null | undefined, marketplace: string): string {
  const t = internal?.trim();
  return t ? t : marketplace;
}

/**
 * Precificação (Fase 3, Inc.2). Modelo por unidade:
 *   lucro(P) = P − custo − frete − comissão%·P − imposto%·P
 *            = P·(1 − comissão% − imposto%) − (custo + frete)
 *
 * `commissionRate`/`taxRate` são frações (0..1); `freight` é valor fixo por unidade.
 */

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

const DENOM_EPS = 1e-6;

/** Preço de equilíbrio (lucro = 0). null se as taxas consomem 100%+ do preço. */
export function breakEvenPrice(unitCost: number, freight: number, commissionRate: number, taxRate: number): number | null {
  const denom = 1 - commissionRate - taxRate;
  if (denom <= DENOM_EPS) return null;
  return round2((unitCost + freight) / denom);
}

/** Preço para atingir a margem-alvo (fração sobre o preço). null se inviável. */
export function suggestedPrice(
  unitCost: number,
  freight: number,
  commissionRate: number,
  taxRate: number,
  targetMargin: number,
): number | null {
  const denom = 1 - commissionRate - taxRate - targetMargin;
  if (denom <= DENOM_EPS) return null;
  return round2((unitCost + freight) / denom);
}

/** Margem realizada (%) a um preço: lucro(P)/P. */
export function realizedMargin(
  price: number,
  unitCost: number,
  freight: number,
  commissionRate: number,
  taxRate: number,
): number {
  if (!(price > 0)) return 0;
  const profit = price * (1 - commissionRate - taxRate) - (unitCost + freight);
  return profit / price;
}
