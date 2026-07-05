import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminSession, getPlan } from '@/lib/admin';
import { updatePlanAction } from '@/lib/admin-plans-actions';
import { AdminHeader } from '../../admin-header';

export const dynamic = 'force-dynamic';

export default async function AdminPlanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  const { id } = await params;
  const p = await getPlan(id);
  if (!p) notFound();

  return (
    <div>
      <AdminHeader email={admin.email} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/admin/plans" className="text-sm text-brand hover:underline">← Planos</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800">Editar {p.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Código <span className="font-mono">{p.code}</span> (imutável).</p>

        <form action={updatePlanAction} className="mt-6 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <Field label="Nome" name="name" defaultValue={p.name} required />
          <Field label="Preço (centavos)" name="priceCents" type="number" defaultValue={String(p.priceCents)} required />
          <label className="text-xs font-medium text-slate-600">Intervalo
            <select name="interval" defaultValue={p.interval} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              <option value="month">Mensal</option>
              <option value="year">Anual</option>
            </select>
          </label>
          <Field label="Trial (dias)" name="trialDays" type="number" defaultValue={String(p.trialDays)} />
          <Field label="Máx. contas (vazio = ∞)" name="maxMarketplaceAccounts" type="number" defaultValue={p.maxMarketplaceAccounts === null ? '' : String(p.maxMarketplaceAccounts)} />
          <Field label="Máx. produtos (vazio = ∞)" name="maxProducts" type="number" defaultValue={p.maxProducts === null ? '' : String(p.maxProducts)} />
          <Field label="Histórico (dias, vazio = ∞)" name="historyWindowDays" type="number" defaultValue={p.historyWindowDays === null ? '' : String(p.historyWindowDays)} />
          <div className="md:col-span-2">
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Salvar</button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, name, type = 'text', required, defaultValue }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
    </label>
  );
}
