import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession, getPlans } from '@/lib/admin';
import { createPlanAction, togglePlanAction } from '@/lib/admin-plans-actions';
import { AdminHeader } from '../admin-header';
import { money } from '../ui';

export const dynamic = 'force-dynamic';

const lim = (v: number | null) => (v === null ? '∞' : String(v));

export default async function AdminPlansPage({ searchParams }: { searchParams: Promise<{ created?: string; saved?: string; error?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  const sp = await searchParams;
  const plans = await getPlans();

  return (
    <div>
      <AdminHeader email={admin.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Planos &amp; Preços</h1>
        {sp.created && <Banner ok>Plano criado.</Banner>}
        {sp.saved && <Banner ok>Plano atualizado.</Banner>}
        {sp.error && <Banner>Não foi possível criar o plano (código duplicado?).</Banner>}

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2">Código</th><th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">Preço</th><th className="px-4 py-2">Contas</th>
                <th className="px-4 py-2">Produtos</th><th className="px-4 py-2">Histórico</th>
                <th className="px-4 py-2">Ativo</th><th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-400">Nenhum plano.</td></tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-700">{p.code}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-2">{money(p.priceCents, p.currency)}<span className="text-slate-400">/{p.interval === 'month' ? 'mês' : 'ano'}</span></td>
                    <td className="px-4 py-2">{lim(p.maxMarketplaceAccounts)}</td>
                    <td className="px-4 py-2">{lim(p.maxProducts)}</td>
                    <td className="px-4 py-2">{lim(p.historyWindowDays)}</td>
                    <td className="px-4 py-2">{p.active ? '✅' : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/plans/${p.id}`} className="text-brand hover:underline">Editar</Link>
                        <form action={togglePlanAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="active" value={(!p.active).toString()} />
                          <button className="text-slate-500 hover:text-slate-800">{p.active ? 'Desativar' : 'Ativar'}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Novo plano</h2>
          <form action={createPlanAction} className="grid gap-3 md:grid-cols-3">
            <Field label="Código (único)" name="code" required placeholder="STARTER" />
            <Field label="Nome" name="name" required placeholder="Starter" />
            <Field label="Preço (centavos)" name="priceCents" type="number" required placeholder="4900" />
            <label className="text-xs font-medium text-slate-600">Intervalo
              <select name="interval" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                <option value="month">Mensal</option>
                <option value="year">Anual</option>
              </select>
            </label>
            <Field label="Trial (dias)" name="trialDays" type="number" placeholder="14" />
            <Field label="Stripe price id" name="stripePriceId" placeholder="price_..." />
            <Field label="Máx. contas (vazio = ∞)" name="maxMarketplaceAccounts" type="number" />
            <Field label="Máx. produtos (vazio = ∞)" name="maxProducts" type="number" />
            <Field label="Histórico (dias, vazio = ∞)" name="historyWindowDays" type="number" />
            <div className="md:col-span-3">
              <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Criar plano</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Field({ label, name, type = 'text', required, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <input name={name} type={type} required={required} placeholder={placeholder} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
    </label>
  );
}

function Banner({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return <div className={`mt-4 rounded-lg border px-4 py-2 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{children}</div>;
}
