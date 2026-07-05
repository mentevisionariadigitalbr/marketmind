import * as React from 'react';
import { formatBRL, formatInt } from '@/lib/format';

/**
 * Gráficos em SVG puro (server-renderable, sem dependências de cliente).
 * Trocáveis por Recharts no futuro sem alterar as páginas (mesmas props).
 */

const W = 640;
const H = 220;
const PAD = 32;

export function LineChart({ points, color = '#2563eb' }: { points: { label: string; value: number }[]; color?: string }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const x = (i: number) => PAD + i * stepX;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const area = `${path} L ${x(points.length - 1)} ${H - PAD} L ${x(0)} ${H - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="Série temporal">
      <path d={area} fill={color} opacity={0.08} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} fill={color} />
      ))}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e2e8f0" />
    </svg>
  );
}

export function BarChart({ bars, money = false }: { bars: { label: string; value: number }[]; money?: boolean }) {
  if (bars.length === 0) return null;
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="space-y-2">
      {bars.map((b, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-slate-600" title={b.label}>
            {b.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
            <div className="h-full rounded bg-blue-500" style={{ width: `${(b.value / max) * 100}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right text-xs font-medium tabular-nums text-slate-700">
            {money ? formatBRL(b.value) : formatInt(b.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Pareto: barras de participação + linha acumulada (curva ABC). */
export function ParetoChart({ entries }: { entries: { sharePct: number; cumulativePct: number; abcClass: 'A' | 'B' | 'C' }[] }) {
  if (entries.length === 0) return null;
  const top = entries.slice(0, 40);
  const stepX = (W - PAD * 2) / Math.max(top.length, 1);
  const colors = { A: '#16a34a', B: '#f59e0b', C: '#94a3b8' } as const;
  const y = (frac: number) => H - PAD - frac * (H - PAD * 2);
  const line = top.map((e, i) => `${i === 0 ? 'M' : 'L'} ${PAD + i * stepX + stepX / 2} ${y(e.cumulativePct)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full" role="img" aria-label="Curva ABC (Pareto)">
      {top.map((e, i) => {
        const barH = e.sharePct * (H - PAD * 2);
        return <rect key={i} x={PAD + i * stepX + 1} y={H - PAD - barH} width={Math.max(stepX - 2, 1)} height={barH} fill={colors[e.abcClass]} opacity={0.85} />;
      })}
      <path d={line} fill="none" stroke="#1e293b" strokeWidth={1.5} />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e2e8f0" />
    </svg>
  );
}
