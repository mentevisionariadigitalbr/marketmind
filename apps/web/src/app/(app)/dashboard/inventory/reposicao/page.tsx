import Link from 'next/link';
import { getForecast, type ReorderRisk } from '@/lib/inventory';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';
import { formatInt } from '@/lib/format';

export const dynamic = 'force-dynamic';

const HORIZONS = [30, 60, 90, 120];
const RISKS: { value: ReorderRisk | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'critico', label: 'Crítico' },
  { value: 'atencao', label: 'Atenção' },
  { value: 'saudavel', label: 'Saudável' },
];

const RISK_BADGE: Record<ReorderRisk, string> = {
  critico: 'bg-red-100 text-red-700',
  atencao: 'bg-amber-100 text-amber-700',
  saudavel: 'bg-emerald-100 text-emerald-700',
};
const RISK_LABEL: Record<ReorderRisk, string> = { critico: 'Crítico', atencao: 'Atenção', saudavel: 'Saudável' };

function chip(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;
}

export default async function ReorderPage({
  searchParams,
}: {
  searchParams: Promise<{ h?: string; risk?: string; needed?: string }>;
}) {
  const sp = await searchParams;
  const horizon = HORIZONS.includes(Number(sp.h)) ? Number(sp.h) : 90;
  const risk = (['critico', 'atencao', 'saudavel'].includes(sp.risk ?? '') ? sp.risk : undefined) as ReorderRisk | undefined;
  const onlyNeeded = sp.needed === '1';

  const rows = (await getForecast({ horizon, risk, onlyNeeded })) ?? [];

  const link = (patch: Record<string, string | undefined>) => {
    const base = { h: String(horizon), risk: risk, needed: onlyNeeded ? '1' : undefined, ...patch };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    return `/dashboard/inventory/reposicao?${q.toString()}`;
  };

  const criticos = rows.filter((r) => r.risk === 'critico').length;
  const totalComprar = rows.reduce((acc, r) => acc + r.purchaseNeed, 0);

  const csvHeaders = ['SKU', 'Produto', 'Fornecedor', 'Disponível', 'CMD/dia', 'Dias restantes', 'Ruptura', 'Lead time', 'Estoque ideal', 'Comprar', 'Risco', 'Última venda'];
  const csvRows = rows.map((r) => [
    r.sku ?? '',
    r.title,
    r.supplierName ?? '',
    r.available,
    r.cmd.toFixed(3).replace('.', ','),
    r.daysRemaining ?? '',
    r.ruptureDate ? new Date(r.ruptureDate).toLocaleDateString('pt-BR') : '',
    r.leadTimeDays,
    r.idealStock,
    r.purchaseNeed,
    RISK_LABEL[r.risk],
    r.lastSale ? new Date(r.lastSale).toLocaleDateString('pt-BR') : '',
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reposição</h1>
          <p className="text-sm text-slate-500">Previsão de consumo, ruptura e sugestão de compra</p>
        </div>
        <ExportCsvButton filename={`reposicao-${new Date().toISOString().slice(0, 10)}`} headers={csvHeaders} rows={csvRows} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Horizonte</span>
          {HORIZONS.map((h) => (
            <Link key={h} href={link({ h: String(h) })} className={chip(h === horizon)}>
              {h}d
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Risco</span>
          {RISKS.map((r) => (
            <Link
              key={r.value}
              href={link({ risk: r.value === 'all' ? undefined : r.value })}
              className={chip((r.value === 'all' && !risk) || r.value === risk)}
            >
              {r.label}
            </Link>
          ))}
        </div>
        <Link href={link({ needed: onlyNeeded ? undefined : '1' })} className={chip(onlyNeeded)}>
          Só com necessidade de compra
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Itens listados</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatInt(rows.length)}</p>
        </div>
        <div className={`rounded-xl border bg-white p-4 shadow-sm ${criticos > 0 ? 'border-red-200' : 'border-slate-200'}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Em risco crítico</p>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${criticos > 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatInt(criticos)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Unidades a comprar ({horizon}d)</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{formatInt(totalComprar)}</p>
        </div>
      </section>

      <Card title={`Previsão por produto (horizonte ${horizon} dias)`}>
        {rows.length === 0 ? (
          <EmptyState title="Nada a exibir" description="Sincronize vendas e estoque, ou ajuste os filtros." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3">Fornecedor</th>
                  <th className="py-2 pr-3 text-right">Disp.</th>
                  <th className="py-2 pr-3 text-right">CMD/dia</th>
                  <th className="py-2 pr-3 text-right">Dias rest.</th>
                  <th className="py-2 pr-3">Ruptura</th>
                  <th className="py-2 pr-3 text-right">Ideal</th>
                  <th className="py-2 pr-3 text-right">Comprar</th>
                  <th className="py-2 pr-3">Risco</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.productId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-500">{r.sku ?? '—'}</td>
                    <td className="py-2 pr-3 max-w-[260px] truncate" title={r.title}>{r.title}</td>
                    <td className="py-2 pr-3 text-slate-500">{r.supplierName ?? '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.available}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.cmd.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.daysRemaining ?? '∞'}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-500">
                      {r.ruptureDate ? new Date(r.ruptureDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{r.idealStock}</td>
                    <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${r.purchaseNeed > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                      {r.purchaseNeed}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${RISK_BADGE[r.risk]}`}>{RISK_LABEL[r.risk]}</span>
                    </td>
                    <td className="py-2 pr-3">
                      {r.purchaseNeed > 0 && (
                        <Link
                          href={`/dashboard/purchases?productId=${r.productId}&quantity=${r.purchaseNeed}${r.supplierId ? `&supplierId=${r.supplierId}` : ''}`}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Comprar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-slate-400">
        CMD = consumo médio diário ponderado (30/60/90 dias). Estoque ideal cobre o horizonte + lead time do fornecedor +
        20% de segurança. Lead time padrão de 15 dias quando o produto não tem fornecedor cadastrado.
      </p>
    </div>
  );
}
