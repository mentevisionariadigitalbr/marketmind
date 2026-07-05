import { redirect } from 'next/navigation';
import { getAdminSession, getAdminMetrics } from '@/lib/admin';
import { AdminHeader } from './admin-header';

export const dynamic = 'force-dynamic';

function money(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default async function AdminHomePage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  const m = await getAdminMetrics();

  return (
    <div>
      <AdminHeader email={admin.email} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-800">Visão geral do negócio</h1>
        <p className="mt-1 text-sm text-slate-500">Métricas agregadas de toda a plataforma.</p>

        {!m ? (
          <p className="mt-6 text-sm text-slate-500">Não foi possível carregar as métricas.</p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="MRR" value={money(m.mrrCents)} hint={`ARR ${money(m.arrCents)}`} />
              <Kpi label="Clientes ativos" value={String(m.activeSubscriptions)} hint={`${m.trialing} em teste`} />
              <Kpi label="Churn (30d)" value={pct(m.churnRate30d)} hint={`${m.canceledLast30d} cancelados`} />
              <Kpi label="Conversão de trial" value={pct(m.trialConversionRate)} hint={`${m.pastDue} inadimplentes`} />
            </div>

            <Card title="MRR por plano">
              {m.byPlan.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma assinatura ativa ainda.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1">Plano</th>
                      <th className="py-1">Ativos</th>
                      <th className="py-1 text-right">MRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.byPlan.map((p) => (
                      <tr key={p.planCode} className="border-t border-slate-100">
                        <td className="py-1.5 font-medium text-slate-800">{p.planName}</td>
                        <td className="py-1.5">{p.activeCount}</td>
                        <td className="py-1.5 text-right">{money(p.mrrCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <p className="mt-4 text-xs text-slate-400">
              Definições — MRR: soma mensal-normalizada das assinaturas ativas. Churn 30d: cancelados
              em 30 dias ÷ (ativos + cancelados em 30d). Conversão: ativos ÷ trials encerrados.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}
