import { forecastReorder, weightedDailyConsumption, purchaseNeedFor } from './forecast';

describe('weightedDailyConsumption', () => {
  it('vendas estáveis (r/dia em todas as janelas) → CMD = r', () => {
    expect(weightedDailyConsumption(30, 60, 90)).toBe(1); // 30/30 = 60/60 = 90/90 = 1
    expect(weightedDailyConsumption(60, 120, 180)).toBe(2);
  });

  it('sem vendas → 0', () => {
    expect(weightedDailyConsumption(0, 0, 0)).toBe(0);
  });

  it('pondera a recência (aceleração recente puxa o CMD para cima)', () => {
    // 30d a 2/dia, 60d/90d a 1/dia → entre 1 e 2, mais perto pela maior recência
    const cmd = weightedDailyConsumption(60, 60, 90); // d30=2, d60=1, d90=1
    expect(cmd).toBeCloseTo(0.5 * 2 + 0.3 * 1 + 0.2 * 1, 4);
    expect(cmd).toBeGreaterThan(1);
  });
});

describe('forecastReorder', () => {
  it('classifica CRÍTICO quando os dias restantes < lead time', () => {
    const f = forecastReorder({ available: 3, units30: 30, units60: 60, units90: 90, leadTimeDays: 7 });
    expect(f.cmd).toBe(1);
    expect(f.daysRemaining).toBe(3);
    expect(f.risk).toBe('critico');
  });

  it('classifica ATENÇÃO quando dias restantes < lead time + 15', () => {
    const f = forecastReorder({ available: 10, units30: 30, units60: 60, units90: 90, leadTimeDays: 7 });
    expect(f.daysRemaining).toBe(10); // 7 <= 10 < 22
    expect(f.risk).toBe('atencao');
  });

  it('classifica SAUDÁVEL com folga', () => {
    const f = forecastReorder({ available: 100, units30: 30, units60: 60, units90: 90, leadTimeDays: 7 });
    expect(f.risk).toBe('saudavel');
  });

  it('sem consumo → dias restantes null, saudável, sem necessidade de compra', () => {
    const f = forecastReorder({ available: 5, units30: 0, units60: 0, units90: 0, leadTimeDays: 7 });
    expect(f.daysRemaining).toBeNull();
    expect(f.risk).toBe('saudavel');
    expect(purchaseNeedFor(f, 90)).toBe(0);
  });

  it('estoque ideal e necessidade de compra cobrem horizonte + lead time + segurança', () => {
    // cmd=1, leadTime=7, safety 20% → ideal(90) = ceil(1×97×1.2) = 117
    const f = forecastReorder({ available: 10, units30: 30, units60: 60, units90: 90, leadTimeDays: 7 });
    expect(purchaseNeedFor(f, 90)).toBe(117 - 10);
    expect(f.horizons.map((h) => h.horizonDays)).toEqual([30, 60, 90, 120]);
  });

  it('zerado com giro → ruptura imediata (crítico)', () => {
    const f = forecastReorder({ available: 0, units30: 60, units60: 120, units90: 180, leadTimeDays: 5 });
    expect(f.cmd).toBe(2);
    expect(f.daysRemaining).toBe(0);
    expect(f.risk).toBe('critico');
  });
});
