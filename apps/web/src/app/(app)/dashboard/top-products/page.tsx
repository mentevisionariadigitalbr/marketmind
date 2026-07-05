import Link from 'next/link';
import { getTopProducts, type PeriodPreset } from '@/lib/dashboard';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { BarChart } from '@/components/dashboard/charts';
import { formatBRL, formatInt, formatPercent } from '@/lib/format';

export const dynamic = 'force-dynamic';

const LIMITS = [10, 50, 100];

export default async function TopProductsPage({ searchParams }: { searchParams: Promise<{ preset?: string; limit?: string }> }) {
  const sp = await searchParams;
  const preset = (sp.preset ?? '30d') as PeriodPreset;
  const limit = LIMITS.includes(Number(sp.limit)) ? Number(sp.limit) : 10;
  const top = await getTopProducts(preset, limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Top Produtos</h1>
          <p className="text-sm text-slate-500">Ranking por receita</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            {LIMITS.map((l) => (
              <Link
                key={l}
                href={`/dashboard/top-products?preset=${preset}&limit=${l}`}
                className={`rounded-md px-3 py-1.5 font-medium ${l === limit ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Top {l}
              </Link>
            ))}
          </div>
          <PeriodSelector basePath="/dashboard/top-products" current={preset} />
        </div>
      </div>

      {!top || top.length === 0 ? (
        <EmptyState title="Sem produtos vendidos" description="O ranking aparece após as primeiras vendas." />
      ) : (
        <>
          <Card title={`Top ${limit} por receita`}>
            <BarChart bars={top.slice(0, 15).map((p) => ({ label: p.title, value: p.revenue }))} money />
          </Card>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">#</th>
                    <th className="px-3">Produto</th>
                    <th className="px-3">SKU</th>
                    <th className="px-3 text-right">Receita</th>
                    <th className="px-3 text-right">Vendas</th>
                    <th className="px-3 text-right">Participação</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((p, i) => (
                    <tr key={p.productId} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                      <td className="max-w-xs truncate px-3 font-medium text-slate-800" title={p.title}>{p.title}</td>
                      <td className="px-3 text-slate-500">{p.sku ?? '—'}</td>
                      <td className="px-3 text-right tabular-nums">{formatBRL(p.revenue)}</td>
                      <td className="px-3 text-right tabular-nums">{formatInt(p.unitsSold)}</td>
                      <td className="px-3 text-right tabular-nums">{formatPercent(p.sharePct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
