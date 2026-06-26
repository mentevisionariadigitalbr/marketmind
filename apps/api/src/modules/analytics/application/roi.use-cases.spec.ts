import { GetProductRoiUseCase, GetSupplierRoiUseCase } from './roi.use-cases';
import { ProductRoiRaw, RoiRepository, SupplierRoiRaw } from '../domain/ports/roi.repository';

class FakeRepo implements RoiRepository {
  productRows: ProductRoiRaw[] = [];
  supplierRows: SupplierRoiRaw[] = [];
  async productRoi() {
    return this.productRows;
  }
  async supplierRoi() {
    return this.supplierRows;
  }
}

describe('GetProductRoiUseCase', () => {
  it('calcula COGS, lucro, ROI, preço efetivo e margem prospectiva', async () => {
    const repo = new FakeRepo();
    repo.productRows = [
      { productId: 'p1', sku: 'S', internalSku: null, title: 'T', internalTitle: 'Interno', price: 100, promoPrice: 80, revenue: 1000, units: 10, unitCost: 60 },
    ];
    const [r] = await new GetProductRoiUseCase(repo).execute('30d');
    expect(r.title).toBe('Interno'); // override interno
    expect(r.sku).toBe('S');
    expect(r.cogs).toBe(600);
    expect(r.profit).toBe(400);
    expect(r.roi).toBeCloseTo(0.6667, 3);
    expect(r.effectivePrice).toBe(80); // promo
    expect(r.prospectiveMargin).toBeCloseTo(0.25, 5); // (80-60)/80
    expect(r.hasCost).toBe(true);
  });

  it('sem custo: ROI/margem 0 e hasCost false', async () => {
    const repo = new FakeRepo();
    repo.productRows = [
      { productId: 'p2', sku: null, internalSku: 'INT', title: 'T2', internalTitle: null, price: 50, promoPrice: null, revenue: 500, units: 5, unitCost: null },
    ];
    const [r] = await new GetProductRoiUseCase(repo).execute();
    expect(r.hasCost).toBe(false);
    expect(r.cogs).toBe(0);
    expect(r.roi).toBe(0);
    expect(r.sku).toBe('INT'); // SKU interno tem precedência
  });
});

describe('GetSupplierRoiUseCase', () => {
  it('filtra inativos e calcula ROI sobre o valor comprado, ordenado por lucro', async () => {
    const repo = new FakeRepo();
    repo.supplierRows = [
      { supplierId: 's1', name: 'A', revenue: 1000, cogs: 600, productsSold: 2, purchased: 500 },
      { supplierId: 's2', name: 'B', revenue: 0, cogs: 0, productsSold: 0, purchased: 0 }, // sem atividade
      { supplierId: 's3', name: 'C', revenue: 300, cogs: 100, productsSold: 1, purchased: 400 },
    ];
    const rows = await new GetSupplierRoiUseCase(repo).execute('90d');
    expect(rows.map((r) => r.supplierId)).toEqual(['s1', 's3']); // s2 filtrado, ordenado por lucro desc
    expect(rows[0]).toMatchObject({ profit: 400, roi: 0.8 }); // 400/500
  });
});
