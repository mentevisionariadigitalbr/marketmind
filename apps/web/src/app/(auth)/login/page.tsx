import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-800">Entrar</h2>
      <p className="mb-5 text-sm text-slate-500">Acesse o painel da sua operação.</p>
      {sp.reset && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Senha redefinida com sucesso. Faça login com a nova senha.
        </div>
      )}
      <Suspense fallback={<p className="text-sm text-slate-400">Carregando…</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500">
        Não tem conta?{' '}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
