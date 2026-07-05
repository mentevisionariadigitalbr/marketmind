import { GetProductUseCase, UpdateProductUseCase } from './product.use-cases';
import { ProductDetail, ProductEditRepository, UpdateProductData } from '../domain/ports/product-edit.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

class FakeRepo implements ProductEditRepository {
  products = new Map<string, ProductDetail>();
  suppliers = new Set<string>();
  patches: UpdateProductData[] = [];

  async findById(id: string) {
    return this.products.get(id) ?? null;
  }
  async update(id: string, data: UpdateProductData) {
    if (!this.products.has(id)) return false;
    this.patches.push(data);
    return true;
  }
  async supplierExists(id: string) {
    return this.suppliers.has(id);
  }
}

describe('UpdateProductUseCase', () => {
  let repo: FakeRepo;
  let uc: UpdateProductUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    repo.products.set('p1', { id: 'p1' } as ProductDetail);
    uc = new UpdateProductUseCase(repo);
  });

  it('normaliza texto e limpa vazio para null; só inclui campos informados', async () => {
    await uc.execute('p1', { internalTitle: '  Nome  ', brand: '' });
    expect(repo.patches[0]).toEqual({ internalTitle: 'Nome', brand: null });
  });

  it('rejeita preço promocional negativo', async () => {
    await expect(uc.execute('p1', { promoPrice: -1 })).rejects.toBeInstanceOf(ValidationError);
  });

  it('aceita promo válido e permite limpar com null', async () => {
    await uc.execute('p1', { promoPrice: 80 });
    expect(repo.patches[0]).toEqual({ promoPrice: 80 });
    await uc.execute('p1', { promoPrice: null });
    expect(repo.patches[1]).toEqual({ promoPrice: null });
  });

  it('valida fornecedor existente quando informado', async () => {
    await expect(uc.execute('p1', { supplierId: 'ghost' })).rejects.toBeInstanceOf(NotFoundError);
    repo.suppliers.add('sup1');
    await uc.execute('p1', { supplierId: 'sup1' });
    expect(repo.patches[0]).toEqual({ supplierId: 'sup1' });
  });

  it('falha quando o produto não existe', async () => {
    await expect(uc.execute('ghost', { brand: 'X' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GetProductUseCase', () => {
  it('falha quando não existe', async () => {
    await expect(new GetProductUseCase(new FakeRepo()).execute('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
