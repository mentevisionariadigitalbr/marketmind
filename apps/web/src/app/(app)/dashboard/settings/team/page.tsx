import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getMembers } from '@/lib/team';
import { inviteMemberAction, assignRoleAction } from '@/lib/team-actions';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';

export const dynamic = 'force-dynamic';

const ROLES = ['MEMBER', 'ADMIN', 'OWNER'];
const STATUS_TONE = { ACTIVE: 'green', INVITED: 'amber', DISABLED: 'slate' } as const;

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ invite?: string; error?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const sp = await searchParams;
  const canManage = session.user.role === 'OWNER';
  const members = await getMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
        <p className="text-sm text-slate-500">Convide membros e defina papéis (permissões).</p>
      </div>

      {sp.invite && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Convite criado. Envie este link para o novo membro definir a senha:
          <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-xs text-slate-700">{sp.invite}</code>
        </div>
      )}
      {sp.error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Não foi possível concluir. Verifique os dados/permissão.</div>}

      {canManage && (
        <Card title="Convidar membro">
          <form action={inviteMemberAction} className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-slate-600">
              Nome
              <input name="name" required className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              E-mail
              <input name="email" type="email" required className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Papel
              <select name="role" defaultValue="MEMBER" className="mt-1 block rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </label>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Gerar convite</button>
          </form>
        </Card>
      )}

      <Card title="Membros">
        {!members || members.length === 0 ? (
          <EmptyState title="Sem membros" description="Convide o primeiro membro acima." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Membro</th>
                <th className="px-2">Status</th>
                <th className="px-2">Papel</th>
                {canManage && <th className="px-2">Alterar papel</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-slate-800">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.email}</div>
                  </td>
                  <td className="px-2"><Badge tone={STATUS_TONE[m.status]}>{m.status === 'INVITED' ? 'Convidado' : m.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="px-2 font-medium text-slate-700">{m.role}</td>
                  {canManage && (
                    <td className="px-2">
                      <form action={assignRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={m.id} />
                        <select name="role" defaultValue={m.role} className="rounded border border-slate-300 px-2 py-1 text-xs">
                          {ROLES.map((r) => (<option key={r} value={r}>{r}</option>))}
                        </select>
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700">Salvar</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
