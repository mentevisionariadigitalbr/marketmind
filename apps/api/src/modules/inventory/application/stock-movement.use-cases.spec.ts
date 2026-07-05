import {
  RegisterAdjustmentUseCase,
  RegisterInventoryCountUseCase,
} from './stock-movement.use-cases';
import {
  CreateMovementData,
  ProductRef,
  StockMovementRepository,
} from '../domain/ports/stock-movement.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

class FakeRepo implements StockMovementRepository {
  products = new Map<string, ProductRef>();
  created: CreateMovementData[] = [];
  ledger = new Map<string, number>();

  seedProduct(id: string, mlAvailable: number) {
    this.products.set(id, { id, sku: id, title: id, mlAvailable });
  }
  async findProduct(id: string) {
    return this.products.get(id) ?? null;
  }
  async currentLedgerBalance(id: string) {
    return this.ledger.has(id) ? (this.ledger.get(id) as number) : null;
  }
  async create(data: CreateMovementData) {
    this.created.push(data);
    this.ledger.set(data.productId, data.balanceAfter);
  }
  async listByProduct() {
    return [];
  }
  async reconciliation() {
    return [];
  }
}

describe('RegisterAdjustmentUseCase', () => {
  let repo: FakeRepo;
  let uc: RegisterAdjustmentUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    uc = new RegisterAdjustmentUseCase(repo);
  });

  it('abre o razão a partir do disponível do ML e aplica o ajuste sinalizado', async () => {
    repo.seedProduct('p1', 10);
    await uc.execute({ productId: 'p1', quantity: -3, reason: 'perda', userId: 'u1' });
    expect(repo.created).toHaveLength(1);
    expect(repo.created[0]).toMatchObject({ type: 'AJUSTE', quantity: -3, balanceAfter: 7, reason: 'perda', createdBy: 'u1' });
  });

  it('acumula sobre o saldo do razão quando já existem movimentos', async () => {
    repo.seedProduct('p1', 10);
    repo.ledger.set('p1', 7);
    await uc.execute({ productId: 'p1', quantity: 5, userId: 'u1' });
    expect(repo.created[0]).toMatchObject({ quantity: 5, balanceAfter: 12 });
  });

  it('rejeita quantidade zero', async () => {
    repo.seedProduct('p1', 10);
    await expect(uc.execute({ productId: 'p1', quantity: 0, userId: 'u1' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita ajuste que deixaria o saldo negativo', async () => {
    repo.seedProduct('p1', 2);
    await expect(uc.execute({ productId: 'p1', quantity: -5, userId: 'u1' })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.created).toHaveLength(0);
  });

  it('falha quando o produto não existe (ou é de outra empresa)', async () => {
    await expect(uc.execute({ productId: 'x', quantity: 1, userId: 'u1' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('RegisterInventoryCountUseCase', () => {
  let repo: FakeRepo;
  let uc: RegisterInventoryCountUseCase;
  beforeEach(() => {
    repo = new FakeRepo();
    uc = new RegisterInventoryCountUseCase(repo);
  });

  it('gera a DIFERENÇA entre a contagem e o disponível do ML', async () => {
    repo.seedProduct('p1', 10);
    await uc.execute({ productId: 'p1', countedQuantity: 8, userId: 'u1' });
    expect(repo.created[0]).toMatchObject({ type: 'INVENTARIO', quantity: -2, balanceAfter: 8 });
  });

  it('usa o saldo do razão como base quando existe', async () => {
    repo.seedProduct('p1', 10);
    repo.ledger.set('p1', 8);
    await uc.execute({ productId: 'p1', countedQuantity: 20, userId: 'u1' });
    expect(repo.created[0]).toMatchObject({ quantity: 12, balanceAfter: 20 });
  });

  it('rejeita contagem negativa', async () => {
    repo.seedProduct('p1', 10);
    await expect(uc.execute({ productId: 'p1', countedQuantity: -1, userId: 'u1' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('permite contagem zero (zera o estoque)', async () => {
    repo.seedProduct('p1', 5);
    await uc.execute({ productId: 'p1', countedQuantity: 0, userId: 'u1' });
    expect(repo.created[0]).toMatchObject({ quantity: -5, balanceAfter: 0 });
  });
});
