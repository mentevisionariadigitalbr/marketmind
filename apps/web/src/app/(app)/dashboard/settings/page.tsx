import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { updateCompanyAction, updateProfileAction, changePasswordAction } from '@/lib/settings-actions';
import { Card } from '@/components/dashboard/primitives';
import { DeleteAccountForm } from '@/components/delete-account-form';

export const dynamic = 'force-dynamic';

const REGIMES = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI'];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; pwd?: string; privacy?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const sp = await searchParams;
  const isOwner = session.user.role === 'OWNER';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-sm text-slate-500">Empresa, perfil e segurança da conta.</p>
      </div>

      {sp.saved === 'company' && <Banner ok>Dados da empresa salvos.</Banner>}
      {sp.saved === 'profile' && <Banner ok>Perfil atualizado.</Banner>}
      {sp.pwd === 'ok' && <Banner ok>Senha alterada com sucesso.</Banner>}
      {(sp.saved === 'error' || sp.pwd === 'error') && <Banner>Não foi possível salvar. Verifique os dados/permissão.</Banner>}
      {sp.privacy === 'delete_error' && <Banner>Não foi possível excluir a conta. Confirme digitando EXCLUIR.</Banner>}

      <Card title="Empresa">
        {isOwner ? (
          <form action={updateCompanyAction} className="grid gap-3 md:grid-cols-3">
            <Field label="Nome" name="name" defaultValue={session.company.name} />
            <Field label="CNPJ" name="taxId" defaultValue={session.company.taxId ?? ''} />
            <label className="text-xs font-medium text-slate-600">
              Regime tributário
              <select name="taxRegime" defaultValue={session.company.taxRegime} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                {REGIMES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-3">
              <Submit>Salvar empresa</Submit>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-500">Apenas o dono da conta (OWNER) pode editar os dados da empresa.</p>
        )}
      </Card>

      <Card title="Meu perfil">
        <form action={updateProfileAction} className="flex flex-wrap items-end gap-3">
          <Field label="Nome" name="name" defaultValue={session.user.name} />
          <div className="text-xs text-slate-500">
            E-mail<br />
            <span className="text-sm text-slate-700">{session.user.email}</span>
          </div>
          <Submit>Salvar perfil</Submit>
        </form>
      </Card>

      <Card title="Trocar senha">
        <form action={changePasswordAction} className="flex flex-wrap items-end gap-3">
          <Field label="Senha atual" name="currentPassword" type="password" />
          <Field label="Nova senha (mín. 8)" name="newPassword" type="password" />
          <Submit>Trocar senha</Submit>
        </form>
      </Card>

      <Card title="Privacidade e meus dados">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Baixe uma cópia dos seus dados pessoais (perfil, sessões, auditoria e aceites) em JSON.
            </p>
            <a
              href="/api/privacy/export"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Exportar meus dados
            </a>
          </div>
          <hr className="border-slate-100" />
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Excluir conta</h3>
            <p className="mb-3 text-sm text-slate-500">
              Em conformidade com a LGPD. Veja a{' '}
              <a href="/legal/privacy" target="_blank" className="font-medium text-brand hover:underline">Política de Privacidade</a>.
            </p>
            <DeleteAccountForm isOwner={isOwner} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Banner({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {children}
    </div>
  );
}

function Field({ label, name, defaultValue, type = 'text' }: { label: string; name: string; defaultValue?: string; type?: string }) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} required className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
    </label>
  );
}

function Submit({ children }: { children: React.ReactNode }) {
  return <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">{children}</button>;
}
