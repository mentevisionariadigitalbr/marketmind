import Link from 'next/link';
import type { Entitlements } from '@/lib/billing';

/**
 * Faixa de cobrança no topo do app: bloqueio (trial expirado/inadimplência) ou
 * aviso de trial terminando. Não renderiza nada quando está tudo certo.
 */
export function BillingBanner({ billing }: { billing: Entitlements | null }) {
  if (!billing) return null;

  if (billing.isBlocked) {
    return (
      <Bar tone="red">
        <span>
          {billing.status === 'TRIALING'
            ? 'Seu período de teste terminou.'
            : 'Seu acesso está suspenso por falta de pagamento.'}{' '}
          Assine um plano para voltar a usar o MarketMind.
        </span>
        <Cta>Ver planos</Cta>
      </Bar>
    );
  }

  if (billing.status === 'TRIALING' && billing.trialDaysLeft !== null && billing.trialDaysLeft <= 3) {
    return (
      <Bar tone="amber">
        <span>Seu teste termina em {billing.trialDaysLeft} dia(s). Garanta o acesso assinando um plano.</span>
        <Cta>Assinar</Cta>
      </Bar>
    );
  }

  return null;
}

function Bar({ children, tone }: { children: React.ReactNode; tone: 'red' | 'amber' }) {
  const cls = tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div className={`border-b ${cls}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        {children}
      </div>
    </div>
  );
}

function Cta({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/dashboard/settings/billing" className="shrink-0 font-semibold underline">
      {children}
    </Link>
  );
}
