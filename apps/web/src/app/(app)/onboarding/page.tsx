import Link from 'next/link';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

const REGIME_LABEL: Record<string, string> = {
  SIMPLES_NACIONAL: 'Simples Nacional',
  LUCRO_PRESUMIDO: 'Lucro Presumido',
  LUCRO_REAL: 'Lucro Real',
  MEI: 'MEI',
};

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const steps = [
    { done: true, label: 'Conta criada', detail: `${session.user.name} (${session.user.email})` },
    { done: true, label: 'Empresa criada', detail: session.company.name },
    {
      done: false,
      label: 'Conectar Mercado Livre',
      detail: 'Disponível no Sprint 2 — sincroniza pedidos e produtos.',
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Bem-vindo(a) ao MarketMind AI 👋</h1>
      <p className="mt-1 text-slate-500">
        Sua empresa <strong>{session.company.name}</strong> está pronta. Regime tributário:{' '}
        {REGIME_LABEL[session.company.taxRegime] ?? session.company.taxRegime}.
      </p>

      <ol className="mt-6 space-y-3">
        {steps.map((step) => (
          <li
            key={step.label}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            <span
              className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {step.done ? '✓' : '•'}
            </span>
            <div>
              <p className="font-medium text-slate-800">{step.label}</p>
              <p className="text-sm text-slate-500">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Ir para o dashboard
      </Link>
    </div>
  );
}
