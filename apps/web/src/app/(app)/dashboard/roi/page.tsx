import { getProductRoi, getSupplierRoi } from '@/lib/roi';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';
import { formatBRL, formatInt } from '@/lib/format';

const pct = (v: number) => `${(v * 100).toFixed(0)}%`.replace('.', ',');

export const dynamic = 'force-dynamic';

const VALID = ['7d', '30d', '90d', '180d', '365d'];

function Pct({ value, muted }: { value: number; muted?: boolean }) {
  const pct = (value * 100).toFixed(0);
  const cls = muted ? 'text-slate-400' : value < 0 ? 'text-red-600' : value > 0 ? 'text-emerald-600' : 'text-slate-500';
  return <span className={`font-semibold tabular-nums ${cls}`}>{value > 0 ? `+${pct}` : pct}%</span>;
}

export default async function RoiPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const sp = await searchParams;
  const preset = VALID.includes(sp.preset ?? '') ? (sp.preset as string) : '90d';
  const [products, suppliers] = await Promise.all([getProductRoi(preset), getSupplierRoi(preset)]);

  const supplierCsv = (suppliers ?? []).map((s) => [s.name, s.purchased, s.revenue, s.profit, pct(s.roi), s.productsSold]);
  const productCsv = (products ?? []).map((p) => [
    p.sku ?? '',
    p.title,
    p.revenue,
    p.hasCost ? p.cogs : '',
    p.hasCost ? p.profit : '',
    p.hasCost ? pct(p.roi) : '',
    p.hasCost ? pct(p.prospectiveMargin) : '',
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ROI</h1>
          <p className="text-sm text-slate-500">Retorno por produto (sobre o custo vendido) e por fornecedor (sobre o valor comprado)</p>
        </div>
        <PeriodSelector basePath="/dashboard/roi" current={preset} />
      </div>

      <Card title="ROI por fornecedor">
        {suppliers && suppliers.length > 0 && (
          <div className="mb-3 flex justify-end">
            <ExportCsvButton
              filename={`roi-fornecedores-${preset}`}
              headers={['Fornecedor', 'Comprado', 'Receita gerada', 'Lucro gerado', 'ROI', 'Produtos']}
              rows={supplierCsv}
            />
          </div>
        )}
        {!suppliers || suppliers.length === 0 ? (
          <EmptyState title="Sem dados" description="Registre compras (recebidas) e vendas para medir o retorno por fornecedor." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Fornecedor</th>
                  <th className="py-2 pr-4 text-right">Comprado</th>
                  <th className="py-2 pr-4 text-right">Receita gerada</th>
                  <th className="py-2 pr-4 text-right">Lucro gerado</th>
                  <th className="py-2 pr-4 text-right">ROI</th>
                  <th className="py-2 pr-4 text-right">Produtos</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.supplierId} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-800">
                      {s.name}
                      {s.lowProfitability && (
                        <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">baixa rentabilidade</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{formatBRL(s.purchased)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatBRL(s.revenue)}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums ${s.profit < 0 ? 'text-red-600' : 'text-slate-800'}`}>{formatBRL(s.profit)}</td>
                    <td className="py-2 pr-4 text-right">{s.purchased > 0 ? <Pct value={s.roi} /> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{formatInt(s.productsSold)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-400">ROI do fornecedor = lucro gerado pelas vendas dos produtos dele ÷ valor comprado (recebido) no período.</p>
          </div>
        )}
      </Card>

      <Card title="ROI por produto">
        {products && products.length > 0 && (
          <div className="mb-3 flex justify-end">
            <ExportCsvButton
              filename={`roi-produtos-${preset}`}
              headers={['SKU', 'Produto', 'Receita', 'COGS', 'Lucro', 'ROI', 'Margem prosp.']}
              rows={productCsv}
            />
          </div>
        )}
        {!products || products.length === 0 ? (
          <EmptyState title="Sem vendas no período" description="Ajuste o período ou sincronize vendas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3 text-right">Receita</th>
                  <th className="py-2 pr-3 text-right">COGS</th>
                  <th className="py-2 pr-3 text-right">Lucro</th>
                  <th className="py-2 pr-3 text-right">ROI</th>
                  <th className="py-2 pr-3 text-right">Margem prosp.</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.productId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-500">{p.sku ?? '—'}</td>
                    <td className="py-2 pr-3 max-w-[260px] truncate" title={p.title}>{p.title}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatBRL(p.revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{p.hasCost ? formatBRL(p.cogs) : '🔒'}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${!p.hasCost ? 'text-slate-300' : p.profit < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {p.hasCost ? formatBRL(p.profit) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right">{p.hasCost ? <Pct value={p.roi} /> : <span className="text-slate-300">sem custo</span>}</td>
                    <td className="py-2 pr-3 text-right">{p.hasCost ? <Pct value={p.prospectiveMargin} muted /> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-400">
              ROI = lucro ÷ COGS (histórico, preço vendido real). Margem prospectiva usa o preço efetivo (promocional quando definido).
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
