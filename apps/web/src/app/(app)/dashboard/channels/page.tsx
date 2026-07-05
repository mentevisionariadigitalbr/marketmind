import { getChannelSummary } from '@/lib/channels';
import { importManualSalesAction } from '@/lib/channels-actions';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { formatBRL, formatInt } from '@/lib/format';

export const dynamic = 'force-dynamic';

const LABEL: Record<string, string> = {
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
  AMAZON: 'Amazon',
  MAGALU: 'Magalu',
  MANUAL: 'Manual / Outros',
};

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ imported?: string; skipped?: string }> }) {
  const sp = await searchParams;
  const rows = (await getChannelSummary(90)) ?? [];
  const imported = sp.imported != null ? Number(sp.imported) : null;
  const skipped = sp.skipped != null ? Number(sp.skipped) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Canais</h1>
        <p className="text-sm text-slate-500">Vendas por marketplace (90 dias) e importação de vendas manuais</p>
      </div>

      {imported != null && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${imported > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {imported} venda(s) importada(s){skipped > 0 ? ` · ${skipped} linha(s) ignorada(s) por erro` : ''}.
        </div>
      )}

      <Card title="Vendas por canal (90 dias)">
        {rows.length === 0 ? (
          <EmptyState title="Sem canais" description="Conecte o Mercado Livre ou importe vendas manuais." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Canal</th>
                  <th className="py-2 pr-4">Conta</th>
                  <th className="py-2 pr-4 text-right">Receita</th>
                  <th className="py-2 pr-4 text-right">Pedidos</th>
                  <th className="py-2 pr-4 text-right">Unidades</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.marketplaceCode}-${i}`} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-800">{LABEL[r.marketplaceCode] ?? r.marketplaceCode}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.nickname ?? '—'}</td>
                    <td className="py-2 pr-4 text-right font-medium tabular-nums">{formatBRL(r.revenue)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatInt(r.orders)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatInt(r.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Importar vendas manuais (CSV)">
        <form action={importManualSalesAction} className="space-y-3">
          <p className="text-sm text-slate-500">
            Uma venda por linha: <code>data, sku, quantidade, preço unitário</code> e, opcionalmente,{' '}
            <code>comissão, frete, referência</code>. Separador <code>,</code> (decimal com ponto) ou <code>;</code> (decimal com vírgula).
          </p>
          <textarea
            name="csv"
            rows={8}
            required
            placeholder={`data,sku,qtd,preco,comissao,frete\n2026-06-25,ABC-123,2,99.90\n25/06/2026;XYZ;1;149,90;15,00;0`}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs focus:border-slate-400 focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Importar
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-400">
          As vendas entram no painel como pedidos do canal &quot;Manual&quot; e contam em DRE, fluxo de caixa e ROI. Reimportar as mesmas linhas não duplica.
        </p>
      </Card>
    </div>
  );
}
