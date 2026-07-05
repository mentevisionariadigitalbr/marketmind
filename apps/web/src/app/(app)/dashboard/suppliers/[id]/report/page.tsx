import Link from 'next/link';
import { getSupplierReport } from '@/lib/suppliers';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';
import { formatBRL, formatInt } from '@/lib/format';

export const dynamic = 'force-dynamic';

const VALID = ['7d', '30d', '90d', '180d', '365d'];
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

function Kpi({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold tabular-nums ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default async function SupplierReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const preset = VALID.includes(sp.preset ?? '') ? (sp.preset as string) : '90d';
  const report = await getSupplierReport(id, preset);

  if (!report) {
    return <EmptyState title="Fornecedor não encontrado" description="Ele pode ter sido removido ou pertence a outra conta." />;
  }
  const { supplier, totals, products } = report;

  const csvRows = products.map((p) => [
    p.sku ?? '',
    p.title,
    p.unitsSold,
    p.revenue,
    p.hasCost ? p.cogs : '',
    p.hasCost ? p.profit : '',
    p.hasCost ? pct(p.marginPct) : '',
    p.available,
    p.hasCost ? p.stockValueAtCost : '',
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{supplier.name}</h1>
          <p className="text-sm text-slate-500">
            Relatório do fornecedor{supplier.leadTimeDays != null ? ` · lead time ${supplier.leadTimeDays}d` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector basePath={`/dashboard/suppliers/${id}/report`} current={preset} />
          <Link href="/dashboard/suppliers" className="text-sm text-slate-500 hover:underline">← Fornecedores</Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Comprado (recebido)" value={formatBRL(totals.purchased)} />
        <Kpi label="Receita gerada" value={formatBRL(totals.revenue)} />
        <Kpi label="Lucro gerado" value={formatBRL(totals.profit)} alert={totals.profit < 0} />
        <Kpi label="ROI" value={totals.purchased > 0 ? pct(totals.roi) : '—'} />
        <Kpi label="Produtos" value={formatInt(totals.productsCount)} />
        <Kpi label="Unidades vendidas" value={formatInt(totals.unitsSold)} />
        <Kpi label="Estoque (un.)" value={formatInt(totals.stockUnits)} />
        <Kpi label="Estoque a custo" value={formatBRL(totals.stockValueAtCost)} />
      </section>

      <Card title="Produtos do fornecedor">
        {products.length > 0 && (
          <div className="mb-3 flex justify-end">
            <ExportCsvButton
              filename={`fornecedor-${supplier.name}-${preset}`}
              headers={['SKU', 'Produto', 'Vendidos', 'Receita', 'COGS', 'Lucro', 'Margem', 'Estoque', 'Estoque a custo']}
              rows={csvRows}
            />
          </div>
        )}
        {products.length === 0 ? (
          <EmptyState title="Sem produtos vinculados" description="Vincule produtos a este fornecedor para ver o desempenho." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Produto</th>
                  <th className="py-2 pr-3 text-right">Vendidos</th>
                  <th className="py-2 pr-3 text-right">Receita</th>
                  <th className="py-2 pr-3 text-right">Lucro</th>
                  <th className="py-2 pr-3 text-right">Margem</th>
                  <th className="py-2 pr-3 text-right">Estoque</th>
                  <th className="py-2 pr-3 text-right">Estoque a custo</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.productId} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-500">{p.sku ?? '—'}</td>
                    <td className="py-2 pr-3 max-w-[240px] truncate" title={p.title}>{p.title}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatInt(p.unitsSold)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatBRL(p.revenue)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${!p.hasCost ? 'text-slate-300' : p.profit < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {p.hasCost ? formatBRL(p.profit) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{p.hasCost ? pct(p.marginPct) : '🔒'}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${p.available === 0 ? 'font-semibold text-red-600' : ''}`}>{formatInt(p.available)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-500">{p.hasCost ? formatBRL(p.stockValueAtCost) : '—'}</td>
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
