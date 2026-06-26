import { GetSupplierReportUseCase } from './supplier-report.use-case';
import { Supplier, SupplierRepository } from '../domain/ports/supplier.repository';
import { SupplierReportProductRaw, SupplierReportRepository } from '../domain/ports/supplier-report.repository';
import { NotFoundError } from '../../iam/application/errors';

class FakeSuppliers implements Partial<SupplierRepository> {
  supplier: Supplier | null = null;
  async findById() {
    return this.supplier;
  }
}

class FakeReport implements SupplierReportRepository {
  rows: SupplierReportProductRaw[] = [];
  purchasedValue = 0;
  async products() {
    return this.rows;
  }
  async purchased() {
    return this.purchasedValue;
  }
}

function buildUseCase() {
  const suppliers = new FakeSuppliers();
  const report = new FakeReport();
  const uc = new GetSupplierReportUseCase(suppliers as unknown as SupplierRepository, report);
  return { suppliers, report, uc };
}

describe('GetSupplierReportUseCase', () => {
  it('falha quando o fornecedor não existe', async () => {
    const { uc } = buildUseCase();
    await expect(uc.execute('x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('consolida COGS, lucro, margem, estoque a custo e ROI', async () => {
    const { suppliers, report, uc } = buildUseCase();
    suppliers.supplier = { id: 's1', name: 'A', leadTimeDays: 10 } as Supplier;
    report.purchasedValue = 500;
    report.rows = [
      { productId: 'p1', sku: 'S1', internalSku: null, title: 'T1', internalTitle: 'Interno', available: 8, unitsSold: 10, revenue: 1000, unitCost: 60 },
      { productId: 'p2', sku: 'S2', internalSku: 'INT2', title: 'T2', internalTitle: null, available: 5, unitsSold: 0, revenue: 0, unitCost: null },
    ];

    const r = await uc.execute('s1', '30d');

    const p1 = r.products.find((p) => p.productId === 'p1')!;
    expect(p1.title).toBe('Interno');
    expect(p1).toMatchObject({ cogs: 600, profit: 400, stockValueAtCost: 480 });
    expect(p1.marginPct).toBeCloseTo(0.4, 5);

    const p2 = r.products.find((p) => p.productId === 'p2')!;
    expect(p2).toMatchObject({ hasCost: false, sku: 'INT2', cogs: 0 });

    expect(r.totals).toMatchObject({ revenue: 1000, cogs: 600, profit: 400, purchased: 500, productsCount: 2, stockUnits: 13 });
    expect(r.totals.roi).toBeCloseTo(0.8, 5);
  });
});
