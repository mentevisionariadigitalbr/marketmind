import { buildCashflowTimeline, isoWeekStarts, mondayOf } from './cashflow';

describe('mondayOf / isoWeekStarts', () => {
  it('resolve a segunda-feira da semana', () => {
    expect(mondayOf(new Date('2026-06-25T12:00:00Z')).toISOString().slice(0, 10)).toBe('2026-06-22'); // qui → seg 22
  });
  it('gera as semanas em torno da referência', () => {
    const weeks = isoWeekStarts(new Date('2026-06-25T00:00:00Z'), 1, 1);
    expect(weeks).toEqual(['2026-06-15', '2026-06-22', '2026-06-29']);
  });
});

describe('buildCashflowTimeline', () => {
  const weeks = ['2026-06-15', '2026-06-22', '2026-06-29'];

  it('distribui entradas/saídas e acumula o saldo', () => {
    const inflows = [
      { date: '2026-06-23', amount: 1000 }, // semana 22
      { date: '2026-06-30', amount: 500 }, // semana 29
    ];
    const outflows = [
      { date: '2026-06-24', amount: 400 }, // semana 22
    ];
    const t = buildCashflowTimeline(inflows, outflows, weeks);
    expect(t[0]).toMatchObject({ inflow: 0, outflow: 0, net: 0, balance: 0 });
    expect(t[1]).toMatchObject({ inflow: 1000, outflow: 400, net: 600, balance: 600 });
    expect(t[2]).toMatchObject({ inflow: 500, outflow: 0, net: 500, balance: 1100 });
  });

  it('lançamentos antes da janela entram no saldo de abertura', () => {
    const inflows = [{ date: '2026-06-01', amount: 300 }]; // antes da 1ª semana
    const t = buildCashflowTimeline(inflows, [], weeks, 100);
    expect(t[0].balance).toBe(400); // abertura 100 + 300 pré-janela
  });

  it('depois da última semana cai no último bucket', () => {
    const t = buildCashflowTimeline([{ date: '2026-07-20', amount: 200 }], [], weeks);
    expect(t[2].inflow).toBe(200);
  });
});
