import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getBilling, getPlans, type Entitlements } from '@/lib/billing';
import { checkoutAction, portalAction } from '@/lib/billing-actions';
import { Card, Badge } from '@/components/dashboard/primitives';

export const dynamic = 'force-dynamic';

function money(cents: number, currency: string): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });
}

function limitLabel(v: number | null): string {
  if (v === null) return 'ilimitado';
  if (v === 0) return '—';
  return String(v);
}

function statusBadge(e: Entitlements) {
  if (e.isBlocked) return <Badge tone="red">Bloqueado</Badge>;
  if (e.status === 'TRIALING') return <Badge tone="amber">Em teste — {e.trialDaysLeft} dia(s)</Badge>;
  if (e.status === 'ACTIVE') return <Badge tone="green">Ativo</Badge>;
  if (e.status === 'PAST_DUE') return <Badge tone="red">Pagamento pendente</Badge>;
  if (e.status === 'CANCELED') return <Badge tone="slate">Cancelado</Badge>;
  return <Badge tone="amber">Incompleto</Badge>;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; portal?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  const sp = await searchParams;
  const isOwner = session.user.role === 'OWNER';

  const [billing, plans] = await Promise.all([getBilling(), getPlans()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Cobrança</h1>
        <p className="text-sm text-slate-500">Plano, assinatura e pagamento da sua conta.</p>
      </div>

      {sp.checkout === 'success' && (
        <Banner ok>Pagamento iniciado. A ativação pode levar alguns instantes após a confirmação.</Banner>
      )}
      {sp.checkout === 'cancel' && <Banner>Checkout cancelado. Você pode tentar novamente quando quiser.</Banner>}
      {sp.checkout === 'error' && <Banner>Não foi possível iniciar o checkout. Verifique sua permissão e tente de novo.</Banner>}
      {sp.portal === 'error' && <Banner>Não foi possível abrir o portal de pagamento.</Banner>}

      {billing && (
        <Card title="Plano atual">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-slate-800">{billing.planName}</span>
              {statusBadge(billing)}
            </div>
            {isOwner && (
              <form action={portalAction}>
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Gerenciar pagamento e faturas
                </button>
              </form>
            )}
          </div>

          {billing.cancelAtPeriodEnd && (
            <p className="mt-2 text-sm text-amber-700">
              Sua assinatura será cancelada ao fim do período atual.
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Usage label="Contas de marketplace" used={billing.usage.marketplaceAccounts} max={billing.limits.maxMarketplaceAccounts} />
            <Usage label="Produtos" used={billing.usage.products} max={billing.limits.maxProducts} />
            <div>
              <dt className="text-slate-500">Janela de histórico</dt>
              <dd className="font-medium text-slate-800">{limitLabel(billing.limits.historyWindowDays)}{billing.limits.historyWindowDays ? ' dias' : ''}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card title="Planos">
        {!isOwner && (
          <p className="mb-3 text-sm text-slate-500">Apenas o dono da conta (OWNER) pode assinar ou trocar de plano.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((p) => {
            const isCurrent = billing?.planCode === p.code && (billing?.status === 'ACTIVE');
            return (
              <div key={p.code} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-semibold text-slate-800">{p.name}</span>
                  <span className="text-sm text-slate-600">
                    {money(p.priceCents, p.currency)}<span className="text-slate-400">/{p.interval === 'month' ? 'mês' : 'ano'}</span>
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  <li>{limitLabel(p.limits.maxMarketplaceAccounts)} contas de marketplace</li>
                  <li>{limitLabel(p.limits.maxProducts)} produtos</li>
                  <li>{limitLabel(p.limits.historyWindowDays)}{p.limits.historyWindowDays ? ' dias' : ''} de histórico</li>
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <span className="text-sm font-medium text-emerald-700">Plano atual</span>
                  ) : isOwner ? (
                    <form action={checkoutAction}>
                      <input type="hidden" name="planCode" value={p.code} />
                      <button className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                        Assinar {p.name}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max: number | null }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">
        {used} / {max === null ? '∞' : max}
      </dd>
    </div>
  );
}

function Banner({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
      {children}
    </div>
  );
}
