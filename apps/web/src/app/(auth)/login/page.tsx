import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-800">Entrar</h2>
      <p className="mb-5 text-sm text-slate-500">Acesse o painel da sua operação.</p>
      <Suspense fallback={<p className="text-sm text-slate-400">Carregando…</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-5 text-center text-sm text-slate-500">
        Não tem conta?{' '}
        <Link href="/signup" className="font-semibold text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
