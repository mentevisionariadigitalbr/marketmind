/**
 * Domínio puro de custos (Fase 1). Encoda a REGRA de custo vigente e de cobertura
 * — a mesma regra que o SQL do repositório espelha. Sem I/O, testável.
 *
 * Princípio: SKU sem custo é COBERTURA FALTANTE, nunca custo zero. Lucro só é
 * calculado sobre a parcela coberta (receita coberta − COGS).
 */

export interface CostComponents {
  readonly acquisitionCost: number;
  readonly inboundFreight: number;
  readonly packagingCost: number;
  readonly otherCost: number;
}

/** Custo unitário total = aquisição + frete de entrada + embalagem + outros. */
export function unitCost(c: CostComponents): number {
  return c.acquisitionCost + c.inboundFreight + c.packagingCost + c.otherCost;
}

export interface CostCandidate extends CostComponents {
  /** 'variant' tem prioridade sobre 'product' na mesma data. */
  readonly level: 'variant' | 'product';
  readonly validFrom: Date;
}

/**
 * Seleciona o custo aplicável a uma data. Regra (espelhada no SQL do repo):
 *  1. custo VIGENTE (validFrom <= atDate) tem prioridade sobre custo futuro;
 *  2. dentro do mesmo grupo, `variant` tem prioridade sobre `product`;
 *  3. entre vigentes, o de maior `validFrom`; entre futuros, o de MENOR
 *     `validFrom` — i.e., o custo mais antigo RETROAGE (cobrir vendas anteriores
 *     ao cadastro), preservando a correção histórica quando há várias vigências.
 * Devolve null apenas se não há nenhum candidato. Não muta a entrada.
 */
export function selectActiveCost(candidates: readonly CostCandidate[], atDate: Date): CostCandidate | null {
  if (candidates.length === 0) return null;
  const t = atDate.getTime();
  return [...candidates].sort((a, b) => {
    const aVig = a.validFrom.getTime() <= t;
    const bVig = b.validFrom.getTime() <= t;
    if (aVig !== bVig) return aVig ? -1 : 1; // vigente antes de futuro
    if (a.level !== b.level) return a.level === 'variant' ? -1 : 1; // variante antes de produto
    if (aVig) return b.validFrom.getTime() - a.validFrom.getTime(); // vigente: mais recente
    return a.validFrom.getTime() - b.validFrom.getTime(); // futuro: mais antigo (retroage)
  })[0];
}

/**
 * Cobertura (0..1): fração de um total (receita ou valor de estoque) cujos SKUs
 * têm custo cadastrado. 0 quando o total é 0. Mantém a convenção de frações do
 * projeto (ver growthRate). Use uma cobertura para vendas e outra para estoque.
 */
export function costCoverage(coveredAmount: number, totalAmount: number): number {
  if (!Number.isFinite(coveredAmount) || !Number.isFinite(totalAmount) || totalAmount <= 0) return 0;
  return coveredAmount / totalAmount;
}

/**
 * Custo médio ponderado após uma entrada de compra (Fase 1, Inc.4):
 *   novo = (estoque×custo_atual + qtd×custo_compra) / (estoque + qtd)
 * Estoque negativo conta como 0. Sem estoque/sem custo prévio → assume o custo da
 * compra. Arredonda a 2 casas (moeda).
 */
export function weightedAverageCost(
  onHand: number,
  currentCost: number,
  incomingQty: number,
  incomingCost: number,
): number {
  const base = Math.max(onHand, 0);
  const totalQty = base + incomingQty;
  if (totalQty <= 0) return round2(incomingCost);
  return round2((base * currentCost + incomingQty * incomingCost) / totalQty);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
