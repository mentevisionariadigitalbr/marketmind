import { classifyAbc } from './abc';

describe('classifyAbc (curva de Pareto)', () => {
  it('ordena por receita desc e acumula participação', () => {
    const result = classifyAbc([
      { key: 'p1', revenue: 100 },
      { key: 'p3', revenue: 700 },
      { key: 'p2', revenue: 200 },
    ]);
    expect(result.map((r) => r.key)).toEqual(['p3', 'p2', 'p1']);
    expect(result[0].sharePct).toBeCloseTo(0.7);
    expect(result[result.length - 1].cumulativePct).toBeCloseTo(1);
  });

  it('classifica A/B/C pelos limites 80/95', () => {
    const result = classifyAbc([
      { key: 'a', revenue: 80 }, // cum 0.80 → A
      { key: 'b', revenue: 15 }, // cum 0.95 → B
      { key: 'c', revenue: 5 }, // cum 1.00 → C
    ]);
    const byKey = Object.fromEntries(result.map((r) => [r.key, r.abcClass]));
    expect(byKey).toEqual({ a: 'A', b: 'B', c: 'C' });
  });

  it('respeita thresholds customizados', () => {
    const result = classifyAbc(
      [
        { key: 'x', revenue: 60 }, // cum 0.60 → A
        { key: 'y', revenue: 30 }, // cum 0.90 → B
        { key: 'z', revenue: 10 }, // cum 1.00 → C
      ],
      { a: 0.6, b: 0.9 },
    );
    const byKey = Object.fromEntries(result.map((r) => [r.key, r.abcClass]));
    expect(byKey).toEqual({ x: 'A', y: 'B', z: 'C' });
  });

  it('ignora receita <= 0', () => {
    const result = classifyAbc([
      { key: 'ok', revenue: 100 },
      { key: 'zero', revenue: 0 },
      { key: 'neg', revenue: -10 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('ok');
  });

  it('lista vazia ou total 0 → []', () => {
    expect(classifyAbc([])).toEqual([]);
    expect(classifyAbc([{ key: 'z', revenue: 0 }])).toEqual([]);
  });

  it('não muta o array de entrada', () => {
    const input = [
      { key: 'a', revenue: 1 },
      { key: 'b', revenue: 2 },
    ];
    const snapshot = [...input];
    classifyAbc(input);
    expect(input).toEqual(snapshot);
  });
});
