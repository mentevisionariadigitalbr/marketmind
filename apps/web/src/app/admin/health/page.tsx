import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession, getHealth } from '@/lib/admin';
import { AdminHeader } from '../admin-header';
import { date } from '../ui';

export const dynamic = 'force-dynamic';

export default async function AdminHealthPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  const h = await getHealth();

  return (
    <div>
      <AdminHeader email={admin.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Integrações &amp; Saúde</h1>
        {!h ? (
          <p className="mt-6 text-sm text-slate-500">Não foi possível carregar a saúde.</p>
        ) : (
          <>
            <h2 className="mt-6 text-sm font-semibold text-slate-700">Contas de marketplace ({h.marketplaceAccounts.total})</h2>
            <div className="mt-2 flex flex-wrap gap-3">
              {Object.entries(h.marketplaceAccounts.byStatus).map(([s, n]) => (
                <Pill key={s} label={s} value={n} />
              ))}
            </div>

            <Card title={`Contas com problema (${h.marketplaceAccounts.problematic.length})`}>
              {h.marketplaceAccounts.problematic.length === 0 ? (
                <p className="text-sm text-emerald-700">Tudo saudável. 🎉</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {h.marketplaceAccounts.problematic.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50">
                        <td className="py-1.5">
                          <Link href={`/admin/companies/${a.companyId}`} className="font-medium text-brand hover:underline">{a.companyName}</Link>
                        </td>
                        <td className="py-1.5 text-slate-600">{a.marketplace}</td>
                        <td className="py-1.5 text-slate-600">{a.nickname ?? '—'}</td>
                        <td className="py-1.5"><span className="text-xs font-medium text-red-700">{a.status}</span></td>
                        <td className="py-1.5 text-right text-slate-500">{a.lastSyncedAt ? `sync ${date(a.lastSyncedAt)}` : 'nunca'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <h2 className="mt-8 text-sm font-semibold text-slate-700">Filas / Jobs</h2>
            <div className="mt-2 flex flex-wrap gap-3">
              {Object.keys(h.jobs.byStatus).length === 0 ? (
                <span className="text-sm text-slate-400">Sem jobs registrados.</span>
              ) : (
                Object.entries(h.jobs.byStatus).map(([s, n]) => <Pill key={s} label={s} value={n} />)
              )}
            </div>

            <Card title={`Falhas recentes (${h.jobs.recentFailures.length})`}>
              {h.jobs.recentFailures.length === 0 ? (
                <p className="text-sm text-emerald-700">Nenhuma falha recente. 🎉</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {h.jobs.recentFailures.map((j) => (
                      <tr key={j.id} className="border-b border-slate-50">
                        <td className="py-1.5 font-mono text-xs text-slate-600">{j.queue}/{j.jobName}</td>
                        <td className="py-1.5 text-slate-500">{j.attempts} tent.</td>
                        <td className="py-1.5 text-red-700">{j.error ?? '—'}</td>
                        <td className="py-1.5 text-right text-slate-500">{date(j.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
      <span className="font-mono text-xs text-slate-500">{label}</span>{' '}
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}
