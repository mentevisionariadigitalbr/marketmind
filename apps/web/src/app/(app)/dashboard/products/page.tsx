import Link from 'next/link';
import { getProducts, type PeriodPreset } from '@/lib/dashboard';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';
import { formatBRL, formatInt } from '@/lib/format';

export const dynamic = 'force-dynamic';

type SP = { preset?: string; page?: string; sku?: string; title?: string; status?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const preset = (sp.preset ?? '30d') as PeriodPreset;
  const page = Math.max(Number(sp.page ?? '1') || 1, 1);
  const data = await getProducts({ preset, page, pageSize: 20, sku: sp.sku, title: sp.title, status: sp.status });

  const mkPageHref = (p: number) => {
    const u = new URLSearchParams();
    u.set('preset', preset);
    u.set('page', String(p));
    if (sp.sku) u.set('sku', sp.sku);
    if (sp.title) u.set('title', sp.title);
    if (sp.status) u.set('status', sp.status);
    return `/dashboard/products?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Produtos</h1>
        <p className="text-sm text-slate-500">Catálogo com receita e vendas do período</p>
      </div>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="preset" value={preset} />
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">SKU</label>
            <input name="sku" defaultValue={sp.sku} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Título</label>
            <input name="title" defaultValue={sp.title} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <input name="status" defaultValue={sp.status} placeholder="active" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </div>
          <button className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark">
            Filtrar
          </button>
        </form>
      </Card>

      {!data || data.items.length === 0 ? (
        <EmptyState title="Nenhum produto" description="Sincronize seu catálogo do Mercado Livre para listar produtos." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Produto</th>
                  <th className="px-3">SKU</th>
                  <th className="px-3">Status</th>
                  <th className="px-3 text-right">Preço</th>
                  <th className="px-3 text-right">Estoque</th>
                  <th className="px-3 text-right">Receita</th>
                  <th className="px-3 text-right">Vendas</th>
                  <th className="px-3 text-right">Margem</th>
                  <th className="px-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.productId} className="border-b border-slate-100 last:border-0">
                    <td className="max-w-xs truncate py-2 pr-3 font-medium text-slate-800" title={p.title}>{p.title}</td>
                    <td className="px-3 text-slate-500">{p.sku ?? '—'}</td>
                    <td className="px-3">
                      <Badge tone={p.status === 'active' ? 'green' : 'slate'}>{p.status}</Badge>
                    </td>
                    <td className="px-3 text-right tabular-nums">{formatBRL(p.price)}</td>
                    <td className={`px-3 text-right tabular-nums ${p.stock === 0 ? 'text-red-600 font-semibold' : ''}`}>
                      {formatInt(p.stock)}
                    </td>
                    <td className="px-3 text-right tabular-nums">{formatBRL(p.revenue)}</td>
                    <td className="px-3 text-right tabular-nums">{formatInt(p.unitsSold)}</td>
                    <td className="px-3 text-right tabular-nums">
                      {p.marginPct === null ? (
                        <span className="text-slate-300" title="Cadastre o custo para ver a margem">—</span>
                      ) : (
                        <span
                          className={
                            p.marginPct < 0
                              ? 'font-semibold text-red-600'
                              : p.marginPct < 0.1
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }
                          title={p.profit !== null ? `Lucro: ${formatBRL(p.profit)}` : undefined}
                        >
                          {(p.marginPct * 100).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 text-right">
                      <Link href={`/dashboard/products/${p.productId}`} className="text-xs font-medium text-brand hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Página {data.page} de {data.totalPages} · {formatInt(data.total)} produtos
            </span>
            <div className="flex gap-2">
              {data.page > 1 && (
                <Link href={mkPageHref(data.page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  Anterior
                </Link>
              )}
              {data.page < data.totalPages && (
                <Link href={mkPageHref(data.page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  Próxima
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
