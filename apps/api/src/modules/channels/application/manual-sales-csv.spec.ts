import { parseManualSalesCsv } from './manual-sales-csv';

describe('parseManualSalesCsv', () => {
  it('lê linhas válidas (separador ; e decimal com vírgula) ignorando cabeçalho', () => {
    const csv = ['data;sku;qtd;preco;comissao;frete', '25/06/2026;ABC;2;10,50;1,20;3,00'].join('\n');
    const res = parseManualSalesCsv(csv);
    expect(res.errors).toHaveLength(0);
    expect(res.rows[0]).toMatchObject({ date: '2026-06-25', sku: 'ABC', quantity: 2, unitPrice: 10.5, commission: 1.2, freight: 3, gross: 21 });
  });

  it('aceita ISO e separador vírgula com ponto decimal', () => {
    const res = parseManualSalesCsv('2026-06-01,XYZ,1,99.90');
    expect(res.rows[0]).toMatchObject({ date: '2026-06-01', sku: 'XYZ', quantity: 1, unitPrice: 99.9, gross: 99.9 });
  });

  it('gera externalId determinístico (idempotente)', () => {
    const a = parseManualSalesCsv('2026-06-01,XYZ,1,100').rows[0];
    const b = parseManualSalesCsv('2026-06-01,XYZ,1,100').rows[0];
    expect(a.externalId).toBe(b.externalId);
  });

  it('coleta erros por linha sem abortar as válidas', () => {
    const csv = ['2026-06-01,A,1,10', 'data-ruim,B,1,10', '2026-06-02,C,0,10'].join('\n');
    const res = parseManualSalesCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.errors).toHaveLength(2);
  });
});
