import { getExpenses } from '@/lib/finance';
import { createExpenseAction, deleteExpenseAction } from '@/lib/finance-actions';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const RECURRENCE_LABEL: Record<string, string> = { NONE: 'Avulsa', MONTHLY: 'Mensal', YEARLY: 'Anual' };

export default async function ExpensesPage() {
  const data = await getExpenses(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Despesas operacionais</h1>
        <p className="text-sm text-slate-500">Lançamentos que entram no lucro líquido do DRE. Recorrentes contam por mês/ano.</p>
      </div>

      <Card title="Nova despesa">
        <form action={createExpenseAction} className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-medium text-slate-600">
            Categoria
            <input name="category" required placeholder="Aluguel" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Tipo
            <select name="kind" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              <option value="FIXED">Fixa</option>
              <option value="VARIABLE">Variável</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Valor (R$)
            <input name="amount" type="number" step="0.01" min="0" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Recorrência
            <select name="recurrence" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              <option value="NONE">Avulsa</option>
              <option value="MONTHLY">Mensal</option>
              <option value="YEARLY">Anual</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Início / competência
            <input name="startsOn" type="date" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Fim (opcional, recorrentes)
            <input name="endsOn" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </label>
          <div className="md:col-span-3">
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Adicionar
            </button>
          </div>
        </form>
      </Card>

      <Card title="Lançamentos">
        {!data || data.items.length === 0 ? (
          <EmptyState title="Nenhuma despesa" description="Adicione a primeira despesa acima." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Categoria</th>
                  <th className="px-2">Tipo</th>
                  <th className="px-2">Recorrência</th>
                  <th className="px-2">Início</th>
                  <th className="px-2">Fim</th>
                  <th className="px-2 text-right">Valor</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 font-medium text-slate-800">{e.category}</td>
                    <td className="px-2"><Badge tone={e.kind === 'FIXED' ? 'blue' : 'slate'}>{e.kind === 'FIXED' ? 'Fixa' : 'Variável'}</Badge></td>
                    <td className="px-2 text-slate-600">{RECURRENCE_LABEL[e.recurrence]}</td>
                    <td className="px-2 text-slate-500">{e.startsOn.slice(0, 10)}</td>
                    <td className="px-2 text-slate-500">{e.endsOn ? e.endsOn.slice(0, 10) : '—'}</td>
                    <td className="px-2 text-right tabular-nums">{formatBRL(e.amount)}</td>
                    <td className="px-2 text-right">
                      <form action={deleteExpenseAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="text-xs text-red-600 hover:underline">remover</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-400">{data.total} lançamentos</p>
          </div>
        )}
      </Card>
    </div>
  );
}
