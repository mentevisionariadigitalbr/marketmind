import {
  CreateSupplierUseCase,
  UpdateSupplierUseCase,
  GetSupplierUseCase,
  AssignProductSupplierUseCase,
} from './supplier.use-cases';
import { ProductSupplierRow, Supplier, SupplierData, SupplierRepository } from '../domain/ports/supplier.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

class FakeRepo implements SupplierRepository {
  suppliers = new Map<string, Supplier>();
  productSupplier = new Map<string, string | null>();
  products = new Set<string>();
  seq = 0;

  async create(data: SupplierData): Promise<string> {
    const id = `s${++this.seq}`;
    this.suppliers.set(id, { id, ...data });
    return id;
  }
  async update(id: string, data: Partial<SupplierData>): Promise<boolean> {
    const s = this.suppliers.get(id);
    if (!s) return false;
    this.suppliers.set(id, { ...s, ...data });
    return true;
  }
  async findById(id: string): Promise<Supplier | null> {
    return this.suppliers.get(id) ?? null;
  }
  async list(): Promise<Supplier[]> {
    return [...this.suppliers.values()];
  }
  async setProductSupplier(productId: string, supplierId: string | null): Promise<boolean> {
    if (!this.products.has(productId)) return false;
    this.productSupplier.set(productId, supplierId);
    return true;
  }
  async listProductsWithSupplier(): Promise<ProductSupplierRow[]> {
    return [];
  }
}

describe('CreateSupplierUseCase', () => {
  let repo: FakeRepo;
  let uc: CreateSupplierUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    uc = new CreateSupplierUseCase(repo);
  });

  it('cria com nome normalizado e active=true por padrão', async () => {
    const { id } = await uc.execute({ name: '  Fornecedor X  ', leadTimeDays: 7 });
    const s = repo.suppliers.get(id)!;
    expect(s).toMatchObject({ name: 'Fornecedor X', leadTimeDays: 7, active: true });
  });

  it('rejeita nome vazio', async () => {
    await expect(uc.execute({ name: '   ' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita lead time negativo', async () => {
    await expect(uc.execute({ name: 'X', leadTimeDays: -1 })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('UpdateSupplierUseCase', () => {
  let repo: FakeRepo;
  let uc: UpdateSupplierUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    uc = new UpdateSupplierUseCase(repo);
  });

  it('atualiza parcialmente', async () => {
    const s = await new CreateSupplierUseCase(repo).execute({ name: 'A' });
    await uc.execute(s.id, { phone: '11999' });
    expect(repo.suppliers.get(s.id)).toMatchObject({ name: 'A', phone: '11999' });
  });

  it('rejeita nome vazio na atualização', async () => {
    const s = await new CreateSupplierUseCase(repo).execute({ name: 'A' });
    await expect(uc.execute(s.id, { name: '  ' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('falha quando o fornecedor não existe', async () => {
    await expect(uc.execute('nope', { phone: '1' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GetSupplierUseCase', () => {
  it('falha quando não existe', async () => {
    const repo = new FakeRepo();
    await expect(new GetSupplierUseCase(repo).execute('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('AssignProductSupplierUseCase', () => {
  let repo: FakeRepo;
  let uc: AssignProductSupplierUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    uc = new AssignProductSupplierUseCase(repo);
  });

  it('vincula produto a um fornecedor existente', async () => {
    const s = await new CreateSupplierUseCase(repo).execute({ name: 'A' });
    repo.products.add('p1');
    await uc.execute('p1', s.id);
    expect(repo.productSupplier.get('p1')).toBe(s.id);
  });

  it('permite desvincular (supplierId null)', async () => {
    repo.products.add('p1');
    await uc.execute('p1', null);
    expect(repo.productSupplier.get('p1')).toBeNull();
  });

  it('falha quando o fornecedor não existe', async () => {
    repo.products.add('p1');
    await expect(uc.execute('p1', 'ghost')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('falha quando o produto não existe', async () => {
    const s = await new CreateSupplierUseCase(repo).execute({ name: 'A' });
    await expect(uc.execute('ghost', s.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
