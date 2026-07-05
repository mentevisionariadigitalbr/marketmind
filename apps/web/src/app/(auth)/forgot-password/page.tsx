import Link from 'next/link';
import { forgotPasswordAction } from '@/lib/password-actions';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;

  if (sp.sent) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Verifique seu e-mail</h2>
        <p className="text-sm text-slate-500">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir sua senha. O link expira em 1 hora.
        </p>
        <Link href="/login" className="text-sm font-semibold text-brand">Voltar para o login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Esqueci minha senha</h2>
        <p className="text-sm text-slate-500">Informe seu e-mail e enviaremos um link para redefinir a senha.</p>
      </div>

      <form action={forgotPasswordAction} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          E-mail
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
        <button className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Enviar link
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="font-semibold text-brand">Voltar para o login</Link>
      </p>
    </div>
  );
}
