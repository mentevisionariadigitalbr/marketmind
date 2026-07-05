import Link from 'next/link';
import { verifyEmailAction } from '@/lib/verification-actions';

export const dynamic = 'force-dynamic';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const sp = await searchParams;

  if (sp.status === 'ok') {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold text-slate-800">E-mail confirmado ✅</h2>
        <p className="text-sm text-slate-500">Sua conta está totalmente ativada. Você já pode entrar.</p>
        <Link href="/login" className="text-sm font-semibold text-brand">Ir para o login</Link>
      </div>
    );
  }

  if (sp.status === 'error' || !sp.token) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Link inválido ou expirado</h2>
        <p className="text-sm text-slate-500">
          Não foi possível confirmar o e-mail. Entre na sua conta e use o banner para reenviar a verificação.
        </p>
        <Link href="/login" className="text-sm font-semibold text-brand">Ir para o login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Confirmar e-mail</h2>
        <p className="text-sm text-slate-500">Clique no botão abaixo para confirmar seu endereço de e-mail.</p>
      </div>
      <form action={verifyEmailAction}>
        <input type="hidden" name="token" value={sp.token} />
        <button className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Confirmar e-mail
        </button>
      </form>
    </div>
  );
}
