import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAdminSession, getCompanyDetail } from '@/lib/admin';
import { impersonateAction } from '@/lib/admin-impersonation-actions';
import { AdminHeader } from '../../admin-header';
import { StatusBadge, InvoiceStatus, money, date } from '../../ui';

export const dynamic = 'force-dynamic';

export default async function AdminCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  const { id } = await params;
  const sp = await searchParams;
  const d = await getCompanyDetail(id);
  if (!d) notFound();

  return (
    <div>
      <AdminHeader email={admin.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/admin/companies" className="text-sm text-brand hover:underline">← Empresas</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{d.company.name}</h1>
          <StatusBadge status={d.subscription?.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {d.company.taxId ?? 'sem CNPJ'} · {d.company.taxRegime} · criada em {date(d.company.createdAt)}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <form action={impersonateAction}>
            <input type="hidden" name="companyId" value={d.company.id} />
            <button className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100">
              Entrar como cliente (somente leitura)
            </button>
          </form>
          {sp.error === 'impersonate' && <span className="text-sm text-red-600">Não foi possível impersonar.</span>}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Assinatura">
            {d.subscription ? (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Row k="Plano" v={d.subscription.planName ?? '—'} />
                <Row k="Status" v={d.subscription.status} />
                <Row k="Provedor" v={d.subscription.provider ?? '—'} />
                <Row k="Fim do período" v={date(d.subscription.currentPeriodEnd)} />
                <Row k="Fim do trial" v={date(d.subscription.trialEndsAt)} />
                <Row k="Cancela no fim" v={d.subscription.cancelAtPeriodEnd ? 'sim' : 'não'} />
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Sem assinatura.</p>
            )}
          </Card>

          <Card title={`Usuários (${d.users.length})`}>
            <ul className="divide-y divide-slate-100 text-sm">
              {d.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-1.5">
                  <span><span className="font-medium text-slate-800">{u.name}</span> <span className="text-slate-400">{u.email}</span></span>
                  <span className="text-xs text-slate-500">{u.role}{u.status !== 'ACTIVE' ? ` · ${u.status}` : ''}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Faturas (${d.invoices.length})`}>
            {d.invoices.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma fatura.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {d.invoices.map((i) => (
                    <tr key={i.id} className="border-b border-slate-50">
                      <td className="py-1.5 text-slate-500">{date(i.issuedAt)}</td>
                      <td className="py-1.5">{money(i.amountCents, i.currency)}</td>
                      <td className="py-1.5">{i.paymentMethod ?? '—'}</td>
                      <td className="py-1.5 text-right"><InvoiceStatus status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={`Contas de marketplace (${d.marketplaceAccounts.length})`}>
            {d.marketplaceAccounts.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma conta conectada.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {d.marketplaceAccounts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-1.5">
                    <span className="text-slate-700">{a.nickname ?? a.externalUserId}</span>
                    <span className="text-xs text-slate-500">{a.status}{a.lastSyncedAt ? ` · sync ${date(a.lastSyncedAt)}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v}</dd>
    </>
  );
}
