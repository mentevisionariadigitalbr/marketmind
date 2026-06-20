import { getCostProducts } from '@/lib/finance';
import { upsertCostAction, importCostsAction } from '@/lib/finance-actions';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

type SP = { page?: string; sku?: string; onlyMissing?: string };

export default async function CostsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(Number(sp.page ?? '1') || 1, 1);
  const onlyMissing = sp.onlyMissing === '1';
  const data = await getCostProducts({ page, pageSize: 20, sku: sp.sku, onlyMissing });

  const missing = data?.items.filter((p) => !p.hasCost).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Custos dos Produtos</h1>
        <p className="text-sm text-slate-500">
          Cadastre o custo unitário para destravar lucro bruto e margem. SKU sem custo entra como
          cobertura faltante — nunca como custo zero.
        </p>
      </div>

      <Card title="Importar custos (CSV)">
        <form action={importCostsAction} className="space-y-3">
          <p className="text-xs text-slate-500">
            Cabeçalho: <code>sku,acquisition_cost,inbound_freight,packaging_cost,other_cost</code>
          </p>
          <textarea
            name="csv"
            rows={4}
            placeholder={'sku,acquisition_cost,inbound_freight,packaging_cost,other_cost\nABC-1,42.50,3.00,1.50,0'}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
          />
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Importar
          </button>
        </form>
      </Card>

      <Card
        title="Produtos"
        action={
          <div className="flex gap-2 text-xs">
            <a
              href="/dashboard/costs"
              className={`rounded-md px-2 py-1 ${!onlyMissing ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Todos
            </a>
            <a
              href="/dashboard/costs?onlyMissing=1"
              className={`rounded-md px-2 py-1 ${onlyMissing ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Sem custo {missing > 0 && `(${missing})`}
            </a>
          </div>
        }
      >
        {!data || data.items.length === 0 ? (
          <EmptyState
            title="Nenhum produto"
            description="Sincronize seu catálogo do Mercado Livre para cadastrar custos."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Produto</th>
                  <th className="px-2">SKU</th>
                  <th className="px-2 text-right">Preço</th>
                  <th className="px-2 text-right">Custo atual</th>
                  <th className="px-2">Aquisição</th>
                  <th className="px-2">Frete</th>
                  <th className="px-2">Embalagem</th>
                  <th className="px-2">Outros</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.productId} className="border-b border-slate-100 last:border-0">
                    <td className="max-w-[14rem] truncate py-2 pr-3 font-medium text-slate-800" title={p.title}>
                      {p.title}
                    </td>
                    <td className="px-2 text-slate-500">{p.sku ?? '—'}</td>
                    <td className="px-2 text-right tabular-nums">{formatBRL(p.price)}</td>
                    <td className="px-2 text-right tabular-nums">
                      {p.hasCost ? (
                        formatBRL(p.currentUnitCost ?? 0)
                      ) : (
                        <Badge tone="amber">sem custo</Badge>
                      )}
                    </td>
                    <td colSpan={5}>
                      <form action={upsertCostAction} className="flex items-center gap-1 py-1">
                        <input type="hidden" name="productId" value={p.productId} />
                        {(['acquisitionCost', 'inboundFreight', 'packagingCost', 'otherCost'] as const).map((field) => (
                          <input
                            key={field}
                            name={field}
                            type="number"
                            step="0.01"
                            min="0"
                            defaultValue={field === 'acquisitionCost' ? (p.currentUnitCost ?? '') : ''}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-xs tabular-nums"
                            placeholder="0,00"
                          />
                        ))}
                        <button className="rounded bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700">
                          Salvar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">{data.total} produtos · página {page}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
