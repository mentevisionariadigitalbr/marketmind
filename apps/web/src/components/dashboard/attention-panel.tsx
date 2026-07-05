import Link from 'next/link';
import { formatBRL, formatInt } from '@/lib/format';

export interface AttentionData {
  criticalReorder: number;
  criticalAlerts: number;
  overduePayables: number;
  outOfStock: number;
}

interface CardDef {
  label: string;
  value: string;
  hint: string;
  href: string;
  alert: boolean;
}

/** Painel "Precisa de atenção" da Overview — cards clicáveis com o que exige ação hoje. */
export function AttentionPanel({ data }: { data: AttentionData }) {
  const cards: CardDef[] = [
    {
      label: 'Reposição crítica',
      value: formatInt(data.criticalReorder),
      hint: 'itens rompem antes da reposição',
      href: '/dashboard/inventory/reposicao?risk=critico',
      alert: data.criticalReorder > 0,
    },
    {
      label: 'Alertas críticos',
      value: formatInt(data.criticalAlerts),
      hint: 'sem estoque, margem/promo negativa',
      href: '/dashboard/alerts',
      alert: data.criticalAlerts > 0,
    },
    {
      label: 'A pagar vencido',
      value: formatBRL(data.overduePayables),
      hint: 'contas em atraso',
      href: '/dashboard/finance/cashflow',
      alert: data.overduePayables > 0,
    },
    {
      label: 'Itens sem estoque',
      value: formatInt(data.outOfStock),
      hint: 'produtos ativos zerados',
      href: '/dashboard/inventory',
      alert: data.outOfStock > 0,
    },
  ];

  const allClear = cards.every((c) => !c.alert);

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-700">Precisa de atenção</h2>
        {allClear && <span className="text-xs text-emerald-600">tudo sob controle 🎉</span>}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group rounded-xl border p-4 shadow-sm transition hover:shadow ${
              c.alert ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${c.alert ? 'text-red-600' : 'text-slate-300'}`}>{c.value}</p>
            <p className="mt-1 text-[11px] text-slate-400 group-hover:text-slate-500">{c.hint} →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
