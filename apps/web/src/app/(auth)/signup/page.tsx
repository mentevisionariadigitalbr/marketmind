import Link from 'next/link';
import { SignupForm } from './signup-form';

export default function SignupPage() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-800">Criar conta</h2>
      <p className="mb-5 text-sm text-slate-500">Cadastre sua empresa e comece em minutos.</p>
      <SignupForm />
      <p className="mt-5 text-center text-sm text-slate-500">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
