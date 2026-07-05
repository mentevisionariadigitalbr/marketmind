import Link from 'next/link';
import { acceptInviteAction } from '@/lib/team-actions';

export const dynamic = 'force-dynamic';

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  const token = sp.token ?? '';

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Convite inválido</h2>
        <p className="text-sm text-slate-500">O link do convite está incompleto. Peça um novo convite ao administrador.</p>
        <Link href="/login" className="text-sm font-semibold text-brand">Ir para o login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Aceitar convite</h2>
        <p className="text-sm text-slate-500">Defina sua senha para ativar o acesso à equipe.</p>
      </div>

      {sp.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Convite inválido ou expirado.
        </div>
      )}

      <form action={acceptInviteAction} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <label className="block text-sm font-medium text-slate-700">
          Nova senha (mín. 8)
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <button className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Ativar conta
        </button>
      </form>
    </div>
  );
}
