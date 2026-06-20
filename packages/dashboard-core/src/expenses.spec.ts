import { expenseAmountInRange, totalOperatingExpenses, type RecurringExpense } from './expenses';

const range = { from: new Date('2026-01-01T00:00:00Z'), to: new Date('2026-04-01T00:00:00Z') }; // Jan, Feb, Mar

const exp = (over: Partial<RecurringExpense>): RecurringExpense => ({
  amount: 100,
  recurrence: 'NONE',
  startsOn: new Date('2026-02-10T00:00:00Z'),
  endsOn: null,
  ...over,
});

describe('expenseAmountInRange', () => {
  it('NONE dentro do período → valor cheio', () => {
    expect(expenseAmountInRange(exp({ recurrence: 'NONE' }), range)).toBe(100);
  });

  it('NONE fora do período → 0', () => {
    expect(expenseAmountInRange(exp({ recurrence: 'NONE', startsOn: new Date('2026-05-01T00:00:00Z') }), range)).toBe(0);
  });

  it('MONTHLY cobre os 3 meses do período', () => {
    expect(expenseAmountInRange(exp({ recurrence: 'MONTHLY', startsOn: new Date('2025-01-01T00:00:00Z') }), range)).toBe(300);
  });

  it('MONTHLY começando no meio conta a partir do mês de início', () => {
    // começa em Fev → conta Fev e Mar = 2 meses
    expect(expenseAmountInRange(exp({ recurrence: 'MONTHLY', startsOn: new Date('2026-02-15T00:00:00Z') }), range)).toBe(200);
  });

  it('MONTHLY com endsOn limita a vigência', () => {
    // ativo Jan-Fev (endsOn 28/Fev exclusivo) → Jan e Fev = 2
    expect(
      expenseAmountInRange(
        exp({ recurrence: 'MONTHLY', startsOn: new Date('2025-01-01T00:00:00Z'), endsOn: new Date('2026-02-28T00:00:00Z') }),
        range,
      ),
    ).toBe(200);
  });

  it('YEARLY conta uma vez por ano-calendário', () => {
    const r = { from: new Date('2025-06-01T00:00:00Z'), to: new Date('2026-06-01T00:00:00Z') }; // 2025 e 2026
    expect(expenseAmountInRange(exp({ amount: 1200, recurrence: 'YEARLY', startsOn: new Date('2025-01-01T00:00:00Z') }), r)).toBe(2400);
  });

  it('vigência inteiramente antes do período → 0', () => {
    expect(
      expenseAmountInRange(
        exp({ recurrence: 'MONTHLY', startsOn: new Date('2024-01-01T00:00:00Z'), endsOn: new Date('2025-01-01T00:00:00Z') }),
        range,
      ),
    ).toBe(0);
  });
});

describe('totalOperatingExpenses', () => {
  it('soma despesas mistas do período', () => {
    const total = totalOperatingExpenses(
      [
        exp({ recurrence: 'MONTHLY', amount: 100, startsOn: new Date('2025-01-01T00:00:00Z') }), // 300
        exp({ recurrence: 'NONE', amount: 50, startsOn: new Date('2026-03-01T00:00:00Z') }), // 50
      ],
      range,
    );
    expect(total).toBe(350);
  });

  it('lista vazia → 0', () => {
    expect(totalOperatingExpenses([], range)).toBe(0);
  });
});
