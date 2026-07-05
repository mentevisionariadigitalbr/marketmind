import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession, getCompanies } from '@/lib/admin';
import { AdminHeader } from '../admin-header';
import { StatusBadge, date } from '../ui';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'ACTIVE', label: 'Ativas' },
  { key: 'TRIALING', label: 'Em teste' },
  { key: 'PAST_DUE', label: 'Inadimplentes' },
  { key: 'CANCELED', label: 'Canceladas' },
];

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const status = sp.status ?? '';
  const data = await getCompanies({ page, status: status || undefined });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const qs = (p: number) => `/admin/companies?page=${p}${status ? `&status=${status}` : ''}`;

  return (
    <div>
      <AdminHeader email={admin.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Empresas</h1>
        <p className="mt-1 text-sm text-slate-500">{data?.total ?? 0} empresa(s).</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/companies${f.key ? `?status=${f.key}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                status === f.key ? 'bg-brand/10 text-brand' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-4 py-2">Empresa</th>
                <th className="px-4 py-2">Plano</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Usuários</th>
                <th className="px-4 py-2">Criada</th>
              </tr>
            </thead>
            <tbody>
              {!data || data.items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nenhuma empresa.</td></tr>
              ) : (
                data.items.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <Link href={`/admin/companies/${c.id}`} className="font-medium text-brand hover:underline">{c.name}</Link>
                      {c.taxId && <span className="ml-2 text-xs text-slate-400">{c.taxId}</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{c.subscription?.planName ?? '—'}</td>
                    <td className="px-4 py-2"><StatusBadge status={c.subscription?.status} /></td>
                    <td className="px-4 py-2 text-slate-600">{c.usersCount}</td>
                    <td className="px-4 py-2 text-slate-500">{date(c.createdAt)}</td>
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
