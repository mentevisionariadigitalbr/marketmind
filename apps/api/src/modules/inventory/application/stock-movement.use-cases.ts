import { Inject, Injectable } from '@nestjs/common';
import {
  STOCK_MOVEMENT_REPOSITORY,
  StockMovementRepository,
  MovementRow,
  ReconciliationRow,
} from '../domain/ports/stock-movement.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

/** Saldo de abertura do razão = disponível atual do ML (quando ainda não há movimentos). */
async function openingOrCurrent(
  repo: StockMovementRepository,
  productId: string,
  mlAvailable: number,
): Promise<number> {
  const ledger = await repo.currentLedgerBalance(productId);
  return ledger ?? mlAvailable;
}

@Injectable()
export class RegisterAdjustmentUseCase {
  constructor(@Inject(STOCK_MOVEMENT_REPOSITORY) private readonly repo: StockMovementRepository) {}

  /** Ajuste manual (perda, quebra, correção). `quantity` sinalizado (+/−). */
  async execute(input: { productId: string; quantity: number; reason?: string; userId: string }): Promise<void> {
    if (!Number.isInteger(input.quantity) || input.quantity === 0) {
      throw new ValidationError('A quantidade do ajuste deve ser um inteiro diferente de zero.');
    }
    const product = await this.repo.findProduct(input.productId);
    if (!product) throw new NotFoundError('Produto');

    const previous = await openingOrCurrent(this.repo, input.productId, product.mlAvailable);
    const balanceAfter = previous + input.quantity;
    if (balanceAfter < 0) {
      throw new ValidationError('O ajuste deixaria o saldo do razão negativo.');
    }
    await this.repo.create({
      productId: input.productId,
      variantId: null,
      type: 'AJUSTE',
      quantity: input.quantity,
      balanceAfter,
      unitCost: null,
      reason: input.reason?.trim() || null,
      referenceType: 'manual',
      referenceId: null,
      createdBy: input.userId,
    });
  }
}

@Injectable()
export class RegisterInventoryCountUseCase {
  constructor(@Inject(STOCK_MOVEMENT_REPOSITORY) private readonly repo: StockMovementRepository) {}

  /** Inventário: contagem física absoluta → gera movimento com a DIFERENÇA. */
  async execute(input: { productId: string; countedQuantity: number; reason?: string; userId: string }): Promise<void> {
    if (!Number.isInteger(input.countedQuantity) || input.countedQuantity < 0) {
      throw new ValidationError('A contagem deve ser um inteiro maior ou igual a zero.');
    }
    const product = await this.repo.findProduct(input.productId);
    if (!product) throw new NotFoundError('Produto');

    const previous = await openingOrCurrent(this.repo, input.productId, product.mlAvailable);
    await this.repo.create({
      productId: input.productId,
      variantId: null,
      type: 'INVENTARIO',
      quantity: input.countedQuantity - previous,
      balanceAfter: input.countedQuantity,
      unitCost: null,
      reason: input.reason?.trim() || null,
      referenceType: 'inventory_count',
      referenceId: null,
      createdBy: input.userId,
    });
  }
}

@Injectable()
export class ListMovementsUseCase {
  constructor(@Inject(STOCK_MOVEMENT_REPOSITORY) private readonly repo: StockMovementRepository) {}
  execute(productId: string, limit = 100): Promise<MovementRow[]> {
    return this.repo.listByProduct(productId, Math.min(Math.max(limit, 1), 500));
  }
}

@Injectable()
export class GetReconciliationUseCase {
  constructor(@Inject(STOCK_MOVEMENT_REPOSITORY) private readonly repo: StockMovementRepository) {}
  execute(): Promise<ReconciliationRow[]> {
    return this.repo.reconciliation();
  }
}
