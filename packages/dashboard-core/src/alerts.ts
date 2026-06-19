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
  | 'sales-spike';

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
}

export const DEFAULT_ALERT_RULES: AlertRules = {
  lowStockThreshold: 5,
  salesDropPct: 0.5,
  salesSpikePct: 1,
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
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
