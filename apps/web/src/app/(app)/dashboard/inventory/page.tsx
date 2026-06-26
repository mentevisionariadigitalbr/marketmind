import { getInventory, type PeriodPreset } from '@/lib/dashboard';
import { getReconciliation, getMovements, type MovementType } from '@/lib/inventory';
import { getCostProducts } from '@/lib/finance';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { StockMovementForm } from '@/components/dashboard/stock-movement-form';
import { formatBRL, formatInt, formatRatio, formatDays } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<MovementType, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  INVENTARIO: 'Inventário',
  DEVOLUCAO: 'Devolução',
};

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

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ preset?: string; product?: string }> }) {
  const sp = await searchParams;
  const preset = (sp.preset ?? '30d') as PeriodPreset;
  const [inv, reconciliation, productsPage, movements] = await Promise.all([
    getInventory(preset),
    getReconciliation(),
    getCostProducts({ pageSize: 300 }),
    sp.product ? getMovements(sp.product) : Promise.resolve(null),
  ]);
  const products = (productsPage?.items ?? []).map((p) => ({ productId: p.productId, sku: p.sku, title: p.title }));
  const divergences = (reconciliation ?? []).filter((r) => r.divergence !== 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estoque</h1>
          <p className="text-sm text-slate-500">Valor, cobertura, giro e operação (razão & conciliação)</p>
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
          <Widget label="Itens com divergência" value={formatInt(divergences.length)} alert={divergences.length > 0} />
        </section>
      )}

      <Card title="Movimentar estoque">
        <StockMovementForm products={products} selected={sp.product} />
      </Card>

      {sp.product && (
        <Card title="Histórico de movimentações">
          {!movements || movements.length === 0 ? (
            <p className="text-sm text-slate-500">Sem movimentações para este produto ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Tipo</th>
                    <th className="py-2 pr-4 text-right">Qtd</th>
                    <th className="py-2 pr-4 text-right">Saldo</th>
                    <th className="py-2 pr-4">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 tabular-nums text-slate-500">{new Date(m.occurredAt).toLocaleString('pt-BR')}</td>
                      <td className="py-2 pr-4">{TYPE_LABEL[m.type]}</td>
                      <td className={`py-2 pr-4 text-right tabular-nums ${m.quantity < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium tabular-nums">{m.balanceAfter}</td>
                      <td className="py-2 pr-4 text-slate-500">{m.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card title="Conciliação: razão × Mercado Livre">
        {divergences.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma divergência entre o razão interno e o disponível do Mercado Livre. (O ML segue mestre do estoque do
            anúncio; o razão registra ajustes e inventário para rastreabilidade.)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Produto</th>
                  <th className="py-2 pr-4 text-right">Razão</th>
                  <th className="py-2 pr-4 text-right">ML</th>
                  <th className="py-2 pr-4 text-right">Divergência</th>
                </tr>
              </thead>
              <tbody>
                {divergences.map((r) => (
                  <tr key={r.productId} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-500">{r.sku ?? '—'}</td>
                    <td className="py-2 pr-4">{r.title}</td>
                    <td className="py-2 pr-4 text-right font-medium tabular-nums">{r.ledgerBalance}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{r.mlAvailable}</td>
                    <td className={`py-2 pr-4 text-right font-semibold tabular-nums ${r.divergence < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {r.divergence > 0 ? `+${r.divergence}` : r.divergence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
