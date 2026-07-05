import { getTaxRules } from '@/lib/finance';
import { upsertTaxRuleAction, deleteTaxRuleAction } from '@/lib/finance-actions';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { formatPercent } from '@/lib/format';

export const dynamic = 'force-dynamic';

const REGIMES = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI'];

export default async function TaxesPage() {
  const rules = await getTaxRules();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Alíquotas de imposto</h1>
        <p className="text-sm text-slate-500">
          Alíquota efetiva por regime (informada pelo contador). Sem regra, usa o default do regime.
          Categoria específica sobrepõe o padrão.
        </p>
      </div>

      <Card title="Definir alíquota">
        <form action={upsertTaxRuleAction} className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-medium text-slate-600">
            Regime
            <select name="regime" className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              {REGIMES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Categoria (id) — opcional
            <input name="category" placeholder="padrão do regime" className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Alíquota (%)
            <input name="ratePct" type="number" step="0.01" min="0" max="100" required className="mt-1 block w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </label>
          <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Salvar
          </button>
        </form>
      </Card>

      <Card title="Regras configuradas">
        {!rules || rules.length === 0 ? (
          <EmptyState title="Nenhuma regra" description="Sem regra, cada regime usa o default (Simples 6%, Lucro Presumido 11,33%)." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Regime</th>
                <th className="px-2">Categoria</th>
                <th className="px-2 text-right">Alíquota</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-800">{r.regime}</td>
                  <td className="px-2 text-slate-600">{r.category ?? 'Padrão do regime'}</td>
                  <td className="px-2 text-right tabular-nums">{formatPercent(r.rate)}</td>
                  <td className="px-2 text-right">
                    <form action={deleteTaxRuleAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs text-red-600 hover:underline">remover</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
