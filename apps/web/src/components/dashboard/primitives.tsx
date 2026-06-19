import * as React from 'react';
import { formatPercent, formatUnit, type Unit } from '@/lib/format';
import type { KpiCard as KpiCardData } from '@/lib/dashboard';

/** Cartão genérico do dashboard. */
export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function TrendIndicator({ direction, changePct }: { direction: 'up' | 'down' | 'flat'; changePct: number }) {
  const map = {
    up: { color: 'text-emerald-600', icon: '▲' },
    down: { color: 'text-red-600', icon: '▼' },
    flat: { color: 'text-slate-400', icon: '■' },
  } as const;
  const s = map[direction];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.color}`}>
      {s.icon} {formatPercent(Math.abs(changePct))}
    </span>
  );
}

/** KPI card. Mostra cadeado quando o KPI depende de tabela ainda inexistente. */
export function MetricCard({ kpi }: { kpi: KpiCardData }) {
  const blocked = kpi.availability !== 'available';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{kpi.label}</p>
        {blocked && <span title="Requer módulo Financeiro" className="text-slate-300">🔒</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${blocked ? 'text-slate-300' : 'text-slate-900'}`}>
        {blocked ? '—' : formatUnit(kpi.value, kpi.unit as Unit)}
      </p>
      <div className="mt-1 h-4">
        {kpi.trend && !blocked ? (
          <TrendIndicator direction={kpi.trend.direction} changePct={kpi.trend.changePct} />
        ) : blocked ? (
          <span className="text-[11px] text-slate-400">Requer módulo Financeiro</span>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  } as const;
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
