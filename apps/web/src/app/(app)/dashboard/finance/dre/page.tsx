import { getDre, type Dre } from '@/lib/finance';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { formatBRL, formatPercent } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Line({ label, value, kind = 'normal' }: { label: string; value: number; kind?: 'normal' | 'deduction' | 'subtotal' | 'result' }) {
  const styles = {
    normal: 'text-slate-700',
    deduction: 'text-slate-500',
    subtotal: 'font-semibold text-slate-800 border-t border-slate-200',
    result: 'font-bold text-slate-900 border-t-2 border-slate-300',
  } as const;
  return (
    <div className={`flex items-center justify-between py-2 ${styles[kind]}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${value < 0 ? 'text-red-600' : ''}`}>
        {kind === 'deduction' && value !== 0 ? `(${formatBRL(value)})` : formatBRL(value)}
      </span>
    </div>
  );
}

export default async function DrePage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const sp = await searchParams;
  const preset = sp.preset ?? 'mtd';
  const dre: Dre | null = await getDre(preset);

  const empty = !dre || dre.grossRevenue === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">DRE — Demonstrativo de Resultado</h1>
          <p className="text-sm text-slate-500">Lucro líquido real do período</p>
        </div>
        <PeriodSelector basePath="/dashboard/finance/dre" current={preset} />
      </div>

      {empty ? (
        <EmptyState title="Sem dados no período" description="Sincronize pedidos e cadastre custos/despesas para ver o DRE." />
      ) : (
        <>
          {dre.costCoveragePct < 1 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              CMV e lucro parciais: custos cadastrados em <strong>{formatPercent(dre.costCoveragePct)}</strong> das vendas.
            </div>
          )}
          <Card>
            <div className="mx-auto max-w-xl text-sm">
              <Line label="Receita bruta" value={dre.grossRevenue} kind="normal" />
              <Line label="(−) Comissão do marketplace" value={dre.deductions.commission} kind="deduction" />
              <Line label="(−) Frete" value={dre.deductions.freight} kind="deduction" />
              <Line label={`(−) Impostos (${formatPercent(dre.effectiveTaxRatePct)})`} value={dre.deductions.taxes} kind="deduction" />
              <Line label="= Receita líquida" value={dre.netRevenue} kind="subtotal" />
              <Line label="(−) CMV (custo das mercadorias)" value={dre.cogs} kind="deduction" />
              <Line label="= Lucro bruto" value={dre.grossProfit} kind="subtotal" />
              <Line label="(−) Despesas operacionais" value={dre.operatingExpenses} kind="deduction" />
              <Line label="= Lucro líquido" value={dre.netProfit} kind="result" />
              <div className="flex items-center justify-end pt-2">
                <Badge tone={dre.netProfit >= 0 ? 'green' : 'red'}>
                  Margem líquida {formatPercent(dre.netMarginPct)}
                </Badge>
              </div>
            </div>
          </Card>
          <p className="text-center text-xs text-slate-400">
            O lucro líquido acima é o mesmo do card “Lucro líquido” no Overview.
          </p>
        </>
      )}
    </div>
  );
}
