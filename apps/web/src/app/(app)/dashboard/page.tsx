import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

const KPIS: { label: string; hint: string }[] = [
  { label: 'Receita Hoje', hint: 'R$' },
  { label: 'Receita do Mês', hint: 'R$' },
  { label: 'Lucro Líquido', hint: 'R$' },
  { label: 'Pedidos', hint: 'un' },
  { label: 'Ticket Médio', hint: 'R$' },
  { label: 'ROI', hint: '%' },
  { label: 'Margem', hint: '%' },
  { label: 'Fluxo de Caixa', hint: 'R$' },
];

function KpiCard({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-300">— {hint}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Executivo</h1>
        <p className="text-sm text-slate-500">
          {session.company.name} · {session.user.role}
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Conecte sua conta do Mercado Livre (Sprint 2) para alimentar os indicadores. Os KPIs abaixo
        são calculados automaticamente a partir dos seus pedidos reais.
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Indicadores
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} hint={kpi.hint} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-800">Sua empresa</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Nome</dt>
              <dd className="font-medium text-slate-800">{session.company.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">CNPJ</dt>
              <dd className="font-medium text-slate-800">{session.company.taxId ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Regime</dt>
              <dd className="font-medium text-slate-800">{session.company.taxRegime}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-800">Seu acesso</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Usuário</dt>
              <dd className="font-medium text-slate-800">{session.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">E-mail</dt>
              <dd className="font-medium text-slate-800">{session.user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Papel</dt>
              <dd className="font-medium text-slate-800">{session.user.role}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
