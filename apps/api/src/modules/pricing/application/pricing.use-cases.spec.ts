import { GetPricingUseCase } from './pricing.use-cases';
import { PricingDefaultsRaw, PricingProductRaw, PricingRepository } from '../domain/ports/pricing.repository';

class FakeRepo implements PricingRepository {
  rows: PricingProductRaw[] = [];
  def: PricingDefaultsRaw = { commissionRate: 0.12, totalFreight: 100, totalUnits: 10 };
  async products() {
    return this.rows;
  }
  async defaults() {
    return this.def;
  }
}

function product(p: Partial<PricingProductRaw>): PricingProductRaw {
  return { productId: 'p1', sku: 'S', internalSku: null, title: 'T', internalTitle: null, price: 100, promoPrice: null, unitCost: 60, units: 5, ...p };
}

describe('GetPricingUseCase', () => {
  it('infere comissão/frete dos defaults e calcula break-even, sugerido e margem', async () => {
    const repo = new FakeRepo();
    repo.rows = [product({})];
    const res = await new GetPricingUseCase(repo).execute({ targetMargin: 0.3 });

    expect(res.params).toMatchObject({ targetMargin: 0.3, commissionRate: 0.12, taxRate: 0, freight: 10 });
    const r = res.products[0];
    expect(r.breakEven).toBeCloseTo(79.55, 1); // 70 / 0,88
    expect(r.suggested).toBeCloseTo(120.69, 1); // 70 / 0,58
    expect(r.realizedMargin).toBeCloseTo(0.18, 4); // (100·0,88 − 70)/100
    expect(r.belowBreakEven).toBe(false);
  });

  it('usa comissão padrão (12%) quando não há histórico', async () => {
    const repo = new FakeRepo();
    repo.def = { commissionRate: 0, totalFreight: 0, totalUnits: 0 };
    repo.rows = [product({})];
    const res = await new GetPricingUseCase(repo).execute({});
    expect(res.params.commissionRate).toBe(0.12);
    expect(res.params.freight).toBe(0);
  });

  it('respeita overrides e marca produto abaixo do break-even', async () => {
    const repo = new FakeRepo();
    repo.def = { commissionRate: 0, totalFreight: 0, totalUnits: 0 };
    repo.rows = [product({ price: 70, promoPrice: null, unitCost: 60 })]; // preço 70 abaixo do break-even
    const res = await new GetPricingUseCase(repo).execute({ commissionRate: 0.2, freight: 5, taxRate: 0.1 });
    expect(res.params).toMatchObject({ commissionRate: 0.2, freight: 5, taxRate: 0.1 });
    // break-even = (60+5)/(1−0,2−0,1) = 65/0,7 = 92,86 > 70
    expect(res.products[0].belowBreakEven).toBe(true);
  });

  it('ordena por margem realizada (pior primeiro)', async () => {
    const repo = new FakeRepo();
    repo.def = { commissionRate: 0, totalFreight: 0, totalUnits: 0 };
    repo.rows = [
      product({ productId: 'good', price: 200, unitCost: 60 }),
      product({ productId: 'bad', price: 65, unitCost: 60 }),
    ];
    const res = await new GetPricingUseCase(repo).execute({});
    expect(res.products[0].productId).toBe('bad');
  });
});
