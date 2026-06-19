import { getCategories, type PeriodPreset } from '@/lib/dashboard';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { BarChart } from '@/components/dashboard/charts';
import { formatBRL, formatPercent } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const sp = await searchParams;
  const preset = (sp.preset ?? '30d') as PeriodPreset;
  const categories = await getCategories(preset);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categorias</h1>
          <p className="text-sm text-slate-500">Receita e participação por categoria</p>
        </div>
        <PeriodSelector basePath="/dashboard/categories" current={preset} />
      </div>

      {!categories || categories.length === 0 ? (
        <EmptyState title="Sem vendas por categoria" description="As categorias aparecem após as primeiras vendas." />
      ) : (
        <>
          <Card title="Receita por categoria">
            <BarChart bars={categories.slice(0, 12).map((c) => ({ label: c.name, value: c.revenue }))} money />
          </Card>
          <Card title="Participação">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="px-3 text-right">Receita</th>
                  <th className="px-3 text-right">Participação</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.categoryId} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-3 text-right tabular-nums">{formatBRL(c.revenue)}</td>
                    <td className="px-3 text-right tabular-nums">{formatPercent(c.sharePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
