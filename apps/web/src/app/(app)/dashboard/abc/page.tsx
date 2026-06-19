import { getAbc, type PeriodPreset } from '@/lib/dashboard';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { ParetoChart } from '@/components/dashboard/charts';
import { formatBRL, formatPercent } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TONE = { A: 'green', B: 'amber', C: 'slate' } as const;

export default async function AbcPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const sp = await searchParams;
  const preset = (sp.preset ?? '90d') as PeriodPreset;
  const abc = await getAbc(preset);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Curva ABC</h1>
          <p className="text-sm text-slate-500">Classificação de Pareto por receita (80/15/5)</p>
        </div>
        <PeriodSelector basePath="/dashboard/abc" current={preset} />
      </div>

      {!abc || abc.entries.length === 0 ? (
        <EmptyState title="Sem dados para ABC" description="A curva ABC requer histórico de vendas." />
      ) : (
        <>
          <div className="flex gap-2">
            <Badge tone="green">Classe A: {abc.counts.A}</Badge>
            <Badge tone="amber">Classe B: {abc.counts.B}</Badge>
            <Badge tone="slate">Classe C: {abc.counts.C}</Badge>
          </div>
          <Card title="Pareto (participação + acumulado)">
            <ParetoChart entries={abc.entries} />
          </Card>
          <Card title="Produtos classificados">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">#</th>
                    <th className="px-3">Classe</th>
                    <th className="px-3 text-right">Receita</th>
                    <th className="px-3 text-right">Participação</th>
                    <th className="px-3 text-right">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {abc.entries.slice(0, 50).map((e, i) => (
                    <tr key={e.key} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                      <td className="px-3"><Badge tone={TONE[e.abcClass]}>{e.abcClass}</Badge></td>
                      <td className="px-3 text-right tabular-nums">{formatBRL(e.revenue)}</td>
                      <td className="px-3 text-right tabular-nums">{formatPercent(e.sharePct)}</td>
                      <td className="px-3 text-right tabular-nums">{formatPercent(e.cumulativePct)}</td>
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
