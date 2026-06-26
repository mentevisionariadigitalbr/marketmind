import Link from 'next/link';
import { getKpis, getTimeline, getTopProducts, getAbc, type PeriodPreset } from '@/lib/dashboard';
import { MetricCard, Card, EmptyState, Badge } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { LineChart, BarChart } from '@/components/dashboard/charts';
import { formatBRL, formatPercent } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PERIODS = [
  { value: '7d', label: '7 dias' },
  { value: '15d', label: '15 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'mtd', label: 'Mês' },
];
const PERIOD_LABEL: Record<string, string> = { '7d': 'últimos 7 dias', '15d': 'últimos 15 dias', '30d': 'últimos 30 dias', mtd: 'mês atual' };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const sp = await searchParams;
  const preset = (PERIODS.some((p) => p.value === sp.preset) ? sp.preset : '30d') as PeriodPreset;

  const [overview, timeline, top, abc] = await Promise.all([
    getKpis(preset),
    getTimeline(preset),
    getTopProducts(preset, 5),
    getAbc(preset),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Executivo</h1>
          <p className="text-sm text-slate-500">Saúde do negócio em tempo real — {PERIOD_LABEL[preset] ?? 'últimos 30 dias'}</p>
        </div>
        <PeriodSelector basePath="/dashboard" current={preset} presets={PERIODS} />
      </div>

      {!overview ? (
        <EmptyState
          title="Sem dados ainda"
          description="Conecte sua conta do Mercado Livre e sincronize pedidos para ver os indicadores."
        />
      ) : (
        <>
          {overview.costCoveragePct < 1 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Lucro parcial: custos cadastrados em{' '}
              <strong>{formatPercent(overview.costCoveragePct)}</strong> das vendas.{' '}
              <Link href="/dashboard/costs" className="font-semibold underline">
                Cadastrar custos
              </Link>{' '}
              para um lucro bruto completo.
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {overview.kpis.map((kpi) => (
              <MetricCard key={kpi.key} kpi={kpi} />
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card title="Receita por período">
                {timeline && timeline.length > 0 ? (
                  <LineChart points={timeline.map((t) => ({ label: t.bucket, value: t.revenue }))} />
                ) : (
                  <EmptyState title="Sem vendas no período" description="As vendas aparecerão aqui assim que houver pedidos." />
                )}
              </Card>
            </div>
            <Card title="Curva ABC">
              {abc && abc.entries.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Badge tone="green">A: {abc.counts.A}</Badge>
                    <Badge tone="amber">B: {abc.counts.B}</Badge>
                    <Badge tone="slate">C: {abc.counts.C}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {abc.counts.A} produtos (classe A) concentram ~80% da receita.
                  </p>
                </div>
              ) : (
                <EmptyState title="Sem dados" description="Curva ABC requer vendas." />
              )}
            </Card>
          </section>

          <Card title="Top 5 produtos por receita">
            {top && top.length > 0 ? (
              <BarChart bars={top.map((p) => ({ label: p.title, value: p.revenue }))} money />
            ) : (
              <EmptyState title="Sem produtos vendidos" description="O ranking aparece após as primeiras vendas." />
            )}
          </Card>

          <p className="text-right text-xs text-slate-400">
            Receita total (top 5): {formatBRL((top ?? []).reduce((s, p) => s + p.revenue, 0))}
          </p>
        </>
      )}
    </div>
  );
}
