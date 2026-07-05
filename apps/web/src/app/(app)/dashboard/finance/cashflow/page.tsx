import { getCashflowProjection, getPayables, getReceivables } from '@/lib/cashflow';
import { getSuppliers } from '@/lib/suppliers';
import { createPayableAction, payPayableAction } from '@/lib/cashflow-actions';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { ExportCsvButton } from '@/components/dashboard/export-csv-button';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const field = 'rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'green' }) {
  const color = tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-emerald-600' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function weekLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}

export default async function CashflowPage() {
  const [proj, payables, receivables, suppliers] = await Promise.all([
    getCashflowProjection(),
    getPayables(),
    getReceivables(),
    getSuppliers(),
  ]);
  const activeSuppliers = (suppliers ?? []).filter((s) => s.active);

  const payCsv = (payables ?? []).map((p) => [
    p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '',
    p.supplierName ?? '',
    p.description ?? '',
    p.amount,
    p.status === 'PAID' ? 'Paga' : 'Pendente',
    p.sourceType === 'purchase_order' ? 'Compra' : 'Manual',
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Fluxo de Caixa</h1>
        <p className="text-sm text-slate-500">Projeção semanal · entradas (vendas) − saídas (a pagar)</p>
      </div>

      {proj && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Entradas (período)" value={formatBRL(proj.totals.inflow)} tone="green" />
          <Kpi label="Saídas (período)" value={formatBRL(proj.totals.outflow)} tone="red" />
          <Kpi label="Resultado" value={formatBRL(proj.totals.net)} tone={proj.totals.net < 0 ? 'red' : 'green'} />
          <Kpi label="Saldo projetado" value={formatBRL(proj.totals.endingBalance)} tone={proj.totals.endingBalance < 0 ? 'red' : undefined} />
          <Kpi label="A pagar vencido" value={formatBRL(proj.totals.overdueAmount)} tone={proj.totals.overdueAmount > 0 ? 'red' : undefined} />
        </section>
      )}

      <Card title="Projeção semanal">
        {!proj || proj.weeks.length === 0 ? (
          <EmptyState title="Sem dados" description="Registre vendas e contas a pagar para projetar o caixa." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Semana</th>
                  <th className="py-2 pr-4 text-right">Entradas</th>
                  <th className="py-2 pr-4 text-right">Saídas</th>
                  <th className="py-2 pr-4 text-right">Resultado</th>
                  <th className="py-2 pr-4 text-right">Saldo acumulado</th>
                </tr>
              </thead>
              <tbody>
                {proj.weeks.map((w) => (
                  <tr key={w.weekStart} className="border-b border-slate-100">
                    <td className="py-2 pr-4 tabular-nums text-slate-500">{weekLabel(w.weekStart)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-emerald-600">{w.inflow ? formatBRL(w.inflow) : '—'}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-red-600">{w.outflow ? formatBRL(w.outflow) : '—'}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums ${w.net < 0 ? 'text-red-600' : 'text-slate-700'}`}>{formatBRL(w.net)}</td>
                    <td className={`py-2 pr-4 text-right font-semibold tabular-nums ${w.balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatBRL(w.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Nova conta a pagar">
        <form action={createPayableAction} className="grid gap-3 md:grid-cols-4">
          <input name="description" placeholder="Descrição" className={field} />
          <input name="amount" type="number" min="0.01" step="0.01" placeholder="Valor" required className={field} />
          <input name="dueDate" type="date" required className={field} />
          <select name="supplierId" defaultValue="" className={field}>
            <option value="">Fornecedor (opcional)</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="md:col-span-4">
            <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Adicionar
            </button>
          </div>
        </form>
      </Card>

      <Card title={`Contas a pagar (${payables?.length ?? 0})`}>
        {payables && payables.length > 0 && (
          <div className="mb-3 flex justify-end">
            <ExportCsvButton filename="contas-a-pagar" headers={['Vencimento', 'Fornecedor', 'Descrição', 'Valor', 'Status', 'Origem']} rows={payCsv} />
          </div>
        )}
        {!payables || payables.length === 0 ? (
          <EmptyState title="Nenhuma conta a pagar" description="Recebimentos de compra geram contas automaticamente." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Vencimento</th>
                  <th className="py-2 pr-4">Fornecedor</th>
                  <th className="py-2 pr-4">Descrição</th>
                  <th className="py-2 pr-4 text-right">Valor</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {payables.map((p) => {
                  const overdue = p.status === 'PENDING' && new Date(p.dueDate).getTime() < Date.now();
                  return (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className={`py-2 pr-4 tabular-nums ${overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                        {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4">{p.supplierName ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-500">{p.description ?? (p.sourceType === 'purchase_order' ? 'Compra recebida' : '—')}</td>
                      <td className="py-2 pr-4 text-right font-medium tabular-nums">{formatBRL(p.amount)}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {p.status === 'PAID' ? 'Paga' : overdue ? 'Vencida' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {p.status === 'PENDING' && (
                          <form action={payPayableAction}>
                            <input type="hidden" name="id" value={p.id} />
                            <button className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">Marcar paga</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="A receber (vendas líquidas recentes)">
        {!receivables || receivables.length === 0 ? (
          <EmptyState title="Sem vendas" description="As vendas pagas aparecem aqui como entradas previstas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Pedido</th>
                  <th className="py-2 pr-4 text-right">Bruto</th>
                  <th className="py-2 pr-4 text-right">Comissão</th>
                  <th className="py-2 pr-4 text-right">Frete</th>
                  <th className="py-2 pr-4 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => (
                  <tr key={r.orderId} className="border-b border-slate-100">
                    <td className="py-2 pr-4 tabular-nums text-slate-500">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.externalId}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatBRL(r.gross)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-400">−{formatBRL(r.commission)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-400">−{formatBRL(r.freight)}</td>
                    <td className="py-2 pr-4 text-right font-medium tabular-nums text-emerald-600">{formatBRL(r.net)}</td>
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
