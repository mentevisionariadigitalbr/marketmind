/**
 * Detecção de alertas executivos — pura e determinística. Recebe sinais por
 * produto (ProductSignal) e regras, devolve alertas ordenados por severidade.
 * Nenhum I/O; a infra só alimenta os números.
 */

import type { ProductSignal } from './ports';

export type AlertType =
  | 'out-of-stock'
  | 'low-stock'
  | 'stale-product'
  | 'negative-margin'
  | 'sales-drop'
  | 'sales-spike'
  | 'excess-stock'
  | 'promo-loss'
  | 'buy-now';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  readonly type: AlertType;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly description: string;
  readonly productId: string;
  readonly sku: string | null;
  /** Valor de referência do alerta (estoque, variação %, margem…). */
  readonly value: number;
}

export interface AlertRules {
  /** Estoque <= este valor (e > 0) → low-stock. Default 5. */
  readonly lowStockThreshold: number;
  /** Queda relativa de vendas que dispara alerta (fração). Default 0.5 (−50%). */
  readonly salesDropPct: number;
  /** Alta relativa de vendas que dispara alerta (fração). Default 1 (+100%). */
  readonly salesSpikePct: number;
  /** Dias do período atual — base para velocidade/cobertura. Default 30. */
  readonly periodDays: number;
  /** Cobertura acima deste nº de dias → excesso de estoque (capital parado). Default 120. */
  readonly excessCoverageDays: number;
}

export const DEFAULT_ALERT_RULES: AlertRules = {
  lowStockThreshold: 5,
  salesDropPct: 0.5,
  salesSpikePct: 1,
  periodDays: 30,
  excessCoverageDays: 120,
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/** Aplica as regras a cada sinal e devolve os alertas (ordenados por severidade). */
export function detectAlerts(
  signals: readonly ProductSignal[],
  rules: AlertRules = DEFAULT_ALERT_RULES,
): Alert[] {
  const alerts: Alert[] = [];

  for (const s of signals) {
    const active = s.status === 'active' || s.status === 'paused';

    // Estoque
    if (active && s.stock <= 0) {
      alerts.push({
        type: 'out-of-stock',
        severity: 'critical',
        title: 'Produto sem estoque',
        description: `${s.title} está ativo e sem estoque.`,
        productId: s.productId,
        sku: s.sku,
        value: s.stock,
      });
    } else if (active && s.stock <= rules.lowStockThreshold) {
      alerts.push({
        type: 'low-stock',
        severity: 'warning',
        title: 'Estoque baixo',
        description: `${s.title} com apenas ${s.stock} em estoque.`,
        productId: s.productId,
        sku: s.sku,
        value: s.stock,
      });
    }

    // Produto parado: ativo, com estoque, mas sem vendas em ambos os períodos.
    if (active && s.stock > 0 && s.unitsSoldCurrent === 0 && s.unitsSoldPrevious === 0) {
      alerts.push({
        type: 'stale-product',
        severity: 'info',
        title: 'Produto parado',
        description: `${s.title} sem vendas no período.`,
        productId: s.productId,
        sku: s.sku,
        value: 0,
      });
    }

    // Margem negativa (só quando há custo cadastrado).
    if (s.marginPct !== null && s.marginPct < 0) {
      alerts.push({
        type: 'negative-margin',
        severity: 'critical',
        title: 'Margem negativa',
        description: `${s.title} com margem de ${(s.marginPct * 100).toFixed(1)}%.`,
        productId: s.productId,
        sku: s.sku,
        value: s.marginPct,
      });
    }

    // Variação de vendas (precisa de base anterior > 0).
    if (s.unitsSoldPrevious > 0) {
      const change = (s.unitsSoldCurrent - s.unitsSoldPrevious) / s.unitsSoldPrevious;
      if (change <= -rules.salesDropPct) {
        alerts.push({
          type: 'sales-drop',
          severity: 'warning',
          title: 'Queda de vendas',
          description: `${s.title} caiu ${Math.abs(change * 100).toFixed(0)}% vs. período anterior.`,
          productId: s.productId,
          sku: s.sku,
          value: change,
        });
      } else if (change >= rules.salesSpikePct) {
        alerts.push({
          type: 'sales-spike',
          severity: 'info',
          title: 'Explosão de vendas',
          description: `${s.title} subiu ${(change * 100).toFixed(0)}% vs. período anterior.`,
          productId: s.productId,
          sku: s.sku,
          value: change,
        });
      }
    }

    // Cobertura (dias) a partir da velocidade do período atual.
    const velocity = rules.periodDays > 0 ? s.unitsSoldCurrent / rules.periodDays : 0;
    const coverageDays = velocity > 0 ? s.stock / velocity : null;

    // Excesso de estoque: capital parado (cobertura muito alta).
    if (active && s.stock > 0 && coverageDays !== null && coverageDays > rules.excessCoverageDays) {
      alerts.push({
        type: 'excess-stock',
        severity: 'info',
        title: 'Excesso de estoque',
        description: `${s.title}: ~${Math.round(coverageDays)} dias de cobertura — capital parado.`,
        productId: s.productId,
        sku: s.sku,
        value: (s.unitCost ?? 0) * s.stock,
      });
    }

    // Comprar hoje: vende e rompe antes da reposição chegar (cobertura <= lead time).
    if (
      active &&
      s.stock > 0 &&
      coverageDays !== null &&
      s.leadTimeDays != null &&
      coverageDays <= s.leadTimeDays
    ) {
      alerts.push({
        type: 'buy-now',
        severity: 'warning',
        title: 'Comprar hoje',
        description: `${s.title}: ~${Math.round(coverageDays)} dias de estoque, lead time ${s.leadTimeDays}d.`,
        productId: s.productId,
        sku: s.sku,
        value: coverageDays,
      });
    }

    // Promoção com prejuízo: preço promocional abaixo do custo.
    if (s.promoPrice != null && s.promoPrice > 0 && s.unitCost != null && s.promoPrice < s.unitCost) {
      alerts.push({
        type: 'promo-loss',
        severity: 'critical',
        title: 'Promoção com prejuízo',
        description: `${s.title}: promo R$${s.promoPrice.toFixed(2)} abaixo do custo R$${s.unitCost.toFixed(2)}.`,
        productId: s.productId,
        sku: s.sku,
        value: s.promoPrice - s.unitCost,
      });
    }
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
