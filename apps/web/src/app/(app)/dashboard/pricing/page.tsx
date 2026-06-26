import { getPricing } from '@/lib/pricing';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const field = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';
const num = (v: string | undefined): number | undefined => {
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const pctFmt = (v: number) => `${(v * 100).toFixed(0)}%`;

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ targetMargin?: string; commission?: string; tax?: string; freight?: string }>;
}) {
  const sp = await searchParams;
  const targetPct = num(sp.targetMargin);
  const commissionPct = num(sp.commission);
  const taxPct = num(sp.tax);
  const freight = num(sp.freight);

  const data = await getPricing({
    targetMargin: targetPct != null ? targetPct / 100 : undefined,
    commissionRate: commissionPct != null ? commissionPct / 100 : undefined,
    taxRate: taxPct != null ? taxPct / 100 : undefined,
    freight,
  });
  const p = data?.params;
  const rows = data?.products ?? [];

  const csv = rows.map((r) => [
    r.sku ?? '',
    r.title,
    r.unitCost,
    r.currentPrice ?? '',
    pctFmt(r.realizedMargin),
    r.breakEven ?? '',
    r.suggested ?? '',
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Precificação</h1>
        <p className="text-sm text-slate-500">Preço sugerido (margem-alvo) e preço mínimo (break-even)</p>
      </div>

      <Card title="Parâmetros">
        <form method="get" className="grid items-end gap-3 md:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Margem-alvo (%)</span>
            <input name="targetMargin" type="number" min={0} max={95} step={1} defaultValue={p ? Math.round(p.targetMargin * 100) : 30} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Comissão (%)</span>
            <input name="commission" type="number" min={0} max={100} step={0.5} defaultValue={p ? +(p.commissionRate * 100).toFixed(1) : ''} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Imposto (%)</span>
            <input name="tax" type="number" min={0} max={100} step={0.5} defaultValue={p ? +(p.taxRate * 100).toFixed(1) : 0} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Frete por un. (R$)</span>
            <input name="freight" type="number" min={0} step="0.01" defaultValue={p ? p.freight : ''} className={field} />
          </label>
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Recalcular
          </button>
        </form>
        {p && (
          <p className="mt-2 text-xs text-slate-400">
            Comissão e frete sugeridos vêm da média dos seus pedidos; ajuste se quiser simular outro cenário.
          </p>
        )}
      </Card>

      <Card title={`Produtos (${rows.length})`}>
        {rows.length > 0 && (
          <div className="mb-3 flex justify-end">
            <ExportCsvButton filename="precificacao" headers={['SKU', 'Produto', 'Custo', 'Preço atual', 'Margem atual', 'Break-even', 'Sugerido']} rows={csv} />
          </div>
        )}
        {rows.length === 0 ? (
          <EmptyState title="Sem produtos com custo" description="Cadastre o custo dos produtos (Custos) para precificar." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3 text-right">Custo</th>
                  <th className="py-2 pr-3 text-right">Preço atual</th>
                  <th className="py-2 pr-3 text-right">Margem atual</th>
                  <th className="py-2 pr-3 text-right">Break-even</th>
                  <th className="py-2 pr-3 text-right">Sugerido</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.productId} className={`border-b border-slate-100 ${r.belowBreakEven ? 'bg-red-50' : ''}`}>
                    <td className="py-2 pr-3 text-slate-500">{r.sku ?? '—'}</td>
                    <td className="py-2 pr-3 max-w-[240px] truncate" title={r.title}>{r.title}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{formatBRL(r.unitCost)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.currentPrice != null ? formatBRL(r.currentPrice) : '—'}</td>
                    <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${r.realizedMargin < 0 ? 'text-red-600' : r.realizedMargin < 0.05 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {pctFmt(r.realizedMargin)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{r.breakEven != null ? formatBRL(r.breakEven) : '—'}</td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums text-slate-900">{r.suggested != null ? formatBRL(r.suggested) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-400">Linhas em vermelho: preço atual abaixo do break-even (vendendo no prejuízo).</p>
          </div>
        )}
      </Card>
    </div>
  );
}
