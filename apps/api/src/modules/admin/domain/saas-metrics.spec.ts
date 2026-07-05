import { computeSaasMetrics, PlanRow, SubscriptionRow } from './saas-metrics';

const PRO: PlanRow = { id: 'pro', code: 'PRO', name: 'Pro', priceCents: 9900, interval: 'month' };
const BIZ: PlanRow = { id: 'biz', code: 'BUSINESS', name: 'Business', priceCents: 29900, interval: 'month' };
const ANNUAL: PlanRow = { id: 'ann', code: 'ANNUAL', name: 'Anual', priceCents: 120000, interval: 'year' };
const PLANS = [PRO, BIZ, ANNUAL];

const NOW = new Date('2026-06-25T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function sub(p: Partial<SubscriptionRow>): SubscriptionRow {
  return { status: 'ACTIVE', planId: 'pro', trialEndsAt: null, canceledAt: null, ...p };
}

describe('computeSaasMetrics', () => {
  it('MRR soma o preço mensal das assinaturas ACTIVE (anual entra como 1/12)', () => {
    const m = computeSaasMetrics(
      [sub({ planId: 'pro' }), sub({ planId: 'biz' }), sub({ planId: 'ann' })],
      PLANS,
      NOW,
    );
    // 9900 + 29900 + round(120000/12)=10000 => 49800
    expect(m.mrrCents).toBe(49800);
    expect(m.arrCents).toBe(49800 * 12);
    expect(m.activeSubscriptions).toBe(3);
  });

  it('conta status e ignora trial/past_due/canceled no MRR', () => {
    const m = computeSaasMetrics(
      [
        sub({ status: 'ACTIVE', planId: 'pro' }),
        sub({ status: 'TRIALING', trialEndsAt: daysAgo(-5) }), // trial vigente
        sub({ status: 'PAST_DUE', planId: 'biz' }),
        sub({ status: 'CANCELED', canceledAt: daysAgo(10) }),
      ],
      PLANS,
      NOW,
    );
    expect(m.mrrCents).toBe(9900); // só o ACTIVE
    expect(m.activeSubscriptions).toBe(1);
    expect(m.trialing).toBe(1);
    expect(m.pastDue).toBe(1);
    expect(m.canceled).toBe(1);
    expect(m.totalSubscriptions).toBe(4);
  });

  it('churn 30d = cancelados em 30d / (ativos + cancelados em 30d)', () => {
    const m = computeSaasMetrics(
      [
        sub({ status: 'ACTIVE' }),
        sub({ status: 'ACTIVE' }),
        sub({ status: 'ACTIVE' }),
        sub({ status: 'CANCELED', canceledAt: daysAgo(5) }), // dentro de 30d
        sub({ status: 'CANCELED', canceledAt: daysAgo(40) }), // fora de 30d
      ],
      PLANS,
      NOW,
    );
    expect(m.canceledLast30d).toBe(1);
    // 1 / (3 + 1) = 0.25
    expect(m.churnRate30d).toBeCloseTo(0.25, 5);
  });

  it('conversão de trial = ACTIVE / (trials encerrados)', () => {
    const m = computeSaasMetrics(
      [
        sub({ status: 'ACTIVE' }), // trial encerrado, converteu
        sub({ status: 'TRIALING', trialEndsAt: daysAgo(2) }), // trial expirou, não converteu
        sub({ status: 'TRIALING', trialEndsAt: daysAgo(-3) }), // trial ainda vigente (não conta)
        sub({ status: 'CANCELED', canceledAt: daysAgo(1) }), // encerrado, não converteu
      ],
      PLANS,
      NOW,
    );
    // trialEnded = ACTIVE(1) + TRIALING-expirado(1) + CANCELED(1) = 3; converted = 1
    expect(m.trialConversionRate).toBeCloseTo(1 / 3, 5);
  });

  it('breakdown por plano ordenado por MRR desc', () => {
    const m = computeSaasMetrics(
      [sub({ planId: 'pro' }), sub({ planId: 'pro' }), sub({ planId: 'biz' })],
      PLANS,
      NOW,
    );
    expect(m.byPlan[0]).toEqual({ planCode: 'BUSINESS', planName: 'Business', activeCount: 1, mrrCents: 29900 });
    expect(m.byPlan[1]).toEqual({ planCode: 'PRO', planName: 'Pro', activeCount: 2, mrrCents: 19800 });
  });

  it('sem assinaturas: tudo zero, sem divisão por zero', () => {
    const m = computeSaasMetrics([], PLANS, NOW);
    expect(m.mrrCents).toBe(0);
    expect(m.trialConversionRate).toBe(0);
    expect(m.churnRate30d).toBe(0);
  });
});
