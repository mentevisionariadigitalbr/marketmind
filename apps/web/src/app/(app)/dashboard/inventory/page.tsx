import { getInventory, type PeriodPreset } from '@/lib/dashboard';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { formatBRL, formatInt, formatRatio, formatDays } from '@/lib/format';

export const dynamic = 'force-dynamic';

function Widget({ label, value, alert, blocked }: { label: string; value: string; alert?: boolean; blocked?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${alert ? 'border-red-200' : 'border-slate-200'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${blocked ? 'text-slate-300' : alert ? 'text-red-600' : 'text-slate-900'}`}>
        {blocked ? '🔒 —' : value}
      </p>
    </div>
  );
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const sp = await searchParams;
  const preset = (sp.preset ?? '30d') as PeriodPreset;
  const inv = await getInventory(preset);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque</h1>
          <p className="text-sm text-slate-500">Valor, cobertura e giro</p>
        </div>
        <PeriodSelector basePath="/dashboard/inventory" current={preset} />
      </div>

      {!inv ? (
        <EmptyState title="Sem dados de estoque" description="Sincronize seu catálogo e estoque para ver os indicadores." />
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Widget label="Valor total (a preço)" value={formatBRL(inv.valueAtPrice)} />
          <Widget label="Produtos ativos" value={formatInt(inv.activeProducts)} />
          <Widget label="Itens sem estoque" value={formatInt(inv.productsWithoutStock)} alert={inv.productsWithoutStock > 0} />
          <Widget label="Cobertura de estoque" value={formatDays(inv.coverageDays)} />
          <Widget label="Giro de estoque" value={formatRatio(inv.turnover)} />
          <Widget label="Valor a custo" value="—" blocked />
        </section>
      )}

      <Card title="Nota">
        <p className="text-sm text-slate-500">
          Valor a custo, giro por COGS e margem exigem a tabela <code>product_costs</code> (módulo Financeiro).
          Até lá, o valor de estoque é calculado a preço de venda.
        </p>
      </Card>
    </div>
  );
}
