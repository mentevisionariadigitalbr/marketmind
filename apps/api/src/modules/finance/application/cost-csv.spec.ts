import { parseCostCsv } from './cost-csv';

describe('parseCostCsv', () => {
  it('parseia cabeçalho + linhas (en)', () => {
    const rows = parseCostCsv('sku,acquisition_cost,inbound_freight,packaging_cost,other_cost\nABC-1,42.50,3,1.5,0');
    expect(rows).toEqual([
      { sku: 'ABC-1', acquisitionCost: 42.5, inboundFreight: 3, packagingCost: 1.5, otherCost: 0 },
    ]);
  });

  it('aceita cabeçalhos em pt e vírgula decimal', () => {
    const rows = parseCostCsv('sku,custo,frete\nXYZ-9,"10,90",2');
    expect(rows[0].sku).toBe('XYZ-9');
    expect(rows[0].acquisitionCost).toBeCloseTo(10.9);
    expect(rows[0].inboundFreight).toBe(2);
  });

  it('colunas ausentes viram 0', () => {
    const rows = parseCostCsv('sku,acquisition_cost\nA,5');
    expect(rows[0]).toEqual({ sku: 'A', acquisitionCost: 5, inboundFreight: 0, packagingCost: 0, otherCost: 0 });
  });

  it('ignora linhas sem SKU e vazias', () => {
    const rows = parseCostCsv('sku,acquisition_cost\n,5\n\nB,7');
    expect(rows).toHaveLength(1);
    expect(rows[0].sku).toBe('B');
  });

  it('CSV vazio ou só cabeçalho → []', () => {
    expect(parseCostCsv('')).toEqual([]);
    expect(parseCostCsv('sku,acquisition_cost')).toEqual([]);
  });

  it('valor inválido → 0 (não NaN)', () => {
    const rows = parseCostCsv('sku,acquisition_cost\nA,abc');
    expect(rows[0].acquisitionCost).toBe(0);
  });
});
