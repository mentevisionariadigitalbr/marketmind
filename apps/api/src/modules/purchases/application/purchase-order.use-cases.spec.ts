import {
  CreatePurchaseOrderUseCase,
  ReceivePurchaseOrderUseCase,
  CancelPurchaseOrderUseCase,
} from './purchase-order.use-cases';
import {
  CreatePurchaseOrderData,
  PurchaseOrderListItem,
  PurchaseOrderRepository,
  PurchaseOrderStatus,
  PurchaseOrderView,
} from '../domain/ports/purchase-order.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

class FakeRepo implements PurchaseOrderRepository {
  suppliers = new Set<string>();
  products = new Set<string>();
  pos = new Map<string, PurchaseOrderView>();
  received: string[] = [];
  cancelled: string[] = [];
  seq = 0;

  async supplierExists(id: string) {
    return this.suppliers.has(id);
  }
  async productsExist(ids: string[]) {
    return ids.every((i) => this.products.has(i));
  }
  async create(data: CreatePurchaseOrderData) {
    const id = `po${++this.seq}`;
    this.pos.set(id, {
      id,
      supplierId: data.supplierId,
      supplierName: null,
      status: 'DRAFT',
      notes: data.notes,
      expectedAt: null,
      receivedAt: null,
      total: 0,
      createdAt: new Date().toISOString(),
      items: [],
    });
    return id;
  }
  async list(): Promise<PurchaseOrderListItem[]> {
    return [];
  }
  async findById(id: string) {
    return this.pos.get(id) ?? null;
  }
  async receive(id: string) {
    this.received.push(id);
    const po = this.pos.get(id);
    if (po) po.status = 'RECEIVED' as PurchaseOrderStatus;
  }
  async cancel(id: string) {
    this.cancelled.push(id);
  }
}

describe('CreatePurchaseOrderUseCase', () => {
  let repo: FakeRepo;
  let uc: CreatePurchaseOrderUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    repo.suppliers.add('sup1');
    repo.products.add('p1');
    uc = new CreatePurchaseOrderUseCase(repo);
  });

  const validItems = [{ productId: 'p1', quantity: 5, unitCost: 10 }];

  it('cria um pedido válido', async () => {
    const { id } = await uc.execute({ supplierId: 'sup1', items: validItems, createdBy: 'u1' });
    expect(repo.pos.get(id)?.status).toBe('DRAFT');
  });

  it('exige fornecedor', async () => {
    await expect(uc.execute({ items: validItems, createdBy: 'u1' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('exige ao menos um item', async () => {
    await expect(uc.execute({ supplierId: 'sup1', items: [], createdBy: 'u1' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita quantidade não positiva', async () => {
    await expect(
      uc.execute({ supplierId: 'sup1', items: [{ productId: 'p1', quantity: 0, unitCost: 10 }], createdBy: 'u1' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita custo negativo', async () => {
    await expect(
      uc.execute({ supplierId: 'sup1', items: [{ productId: 'p1', quantity: 1, unitCost: -1 }], createdBy: 'u1' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('falha quando o fornecedor não existe', async () => {
    await expect(uc.execute({ supplierId: 'ghost', items: validItems, createdBy: 'u1' })).rejects.toBeInstanceOf(NotFoundError);
  });

  it('falha quando algum produto não existe', async () => {
    await expect(
      uc.execute({ supplierId: 'sup1', items: [{ productId: 'ghost', quantity: 1, unitCost: 10 }], createdBy: 'u1' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('ReceivePurchaseOrderUseCase', () => {
  let repo: FakeRepo;
  let uc: ReceivePurchaseOrderUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    uc = new ReceivePurchaseOrderUseCase(repo);
  });

  it('recebe um pedido em rascunho', async () => {
    repo.pos.set('po1', { id: 'po1', status: 'DRAFT' } as PurchaseOrderView);
    await uc.execute('po1', 'u1');
    expect(repo.received).toContain('po1');
  });

  it('falha quando não existe', async () => {
    await expect(uc.execute('nope', 'u1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita receber duas vezes', async () => {
    repo.pos.set('po1', { id: 'po1', status: 'RECEIVED' } as PurchaseOrderView);
    await expect(uc.execute('po1', 'u1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita receber cancelado', async () => {
    repo.pos.set('po1', { id: 'po1', status: 'CANCELLED' } as PurchaseOrderView);
    await expect(uc.execute('po1', 'u1')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('CancelPurchaseOrderUseCase', () => {
  it('rejeita cancelar um pedido recebido', async () => {
    const repo = new FakeRepo();
    repo.pos.set('po1', { id: 'po1', status: 'RECEIVED' } as PurchaseOrderView);
    await expect(new CancelPurchaseOrderUseCase(repo).execute('po1')).rejects.toBeInstanceOf(ValidationError);
  });

  it('cancela um rascunho', async () => {
    const repo = new FakeRepo();
    repo.pos.set('po1', { id: 'po1', status: 'DRAFT' } as PurchaseOrderView);
    await new CancelPurchaseOrderUseCase(repo).execute('po1');
    expect(repo.cancelled).toContain('po1');
  });
});
