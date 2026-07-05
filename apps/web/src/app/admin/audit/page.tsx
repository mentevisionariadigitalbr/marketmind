import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession, getAudit } from '@/lib/admin';
import { AdminHeader } from '../admin-header';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const action = sp.action ?? '';
  const data = await getAudit({ page, action: action || undefined });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const qs = (p: number) => `/admin/audit?page=${p}${action ? `&action=${encodeURIComponent(action)}` : ''}`;

  return (
    <div>
      <AdminHeader email={admin.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Auditoria</h1>
        <p className="mt-1 text-sm text-slate-500">{data?.total ?? 0} registro(s).</p>

        <form className="mt-4" action="/admin/audit" method="get">
          <input
            name="action"
            defaultValue={action}
            placeholder="Filtrar por ação (ex.: auth.login, admin.plan)"
            className="w-80 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </form>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2">Quando</th><th className="px-4 py-2">Ação</th>
                <th className="px-4 py-2">Rota</th><th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Empresa</th><th className="px-4 py-2">Ator</th>
                <th className="px-4 py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Nenhum registro.</td></tr>
              ) : (
                data.items.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 text-slate-500">{a.createdAt.replace('T', ' ').slice(0, 19)}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{a.action}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{a.method} {a.path}</td>
                    <td className="px-4 py-2">{a.statusCode}</td>
                    <td className="px-4 py-2">
                      {a.companyId ? <Link href={`/admin/companies/${a.companyId}`} className="text-brand hover:underline">{a.companyId.slice(0, 8)}</Link> : '—'}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{a.userId ? a.userId.slice(0, 8) : '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{a.ip ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href={qs(Math.max(1, page - 1))} className={`text-brand ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}>← Anterior</Link>
            <span className="text-slate-500">Página {page} de {totalPages}</span>
            <Link href={qs(Math.min(totalPages, page + 1))} className={`text-brand ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>Próxima →</Link>
          </div>
        )}
      </main>
    </div>
  );
}
