import { Inject, Injectable } from '@nestjs/common';
import {
  PURCHASE_ORDER_REPOSITORY,
  PurchaseOrderRepository,
  PurchaseOrderListItem,
  PurchaseOrderView,
} from '../domain/ports/purchase-order.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

export interface CreatePurchaseOrderInput {
  supplierId?: string;
  notes?: string;
  expectedAt?: string;
  items?: { productId: string; quantity: number; unitCost: number }[];
  createdBy: string | null;
}

@Injectable()
export class CreatePurchaseOrderUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly repo: PurchaseOrderRepository) {}

  async execute(input: CreatePurchaseOrderInput): Promise<{ id: string }> {
    if (!input.supplierId) throw new ValidationError('Selecione um fornecedor.');
    const items = input.items ?? [];
    if (items.length === 0) throw new ValidationError('Inclua ao menos um item.');
    for (const it of items) {
      if (!it.productId) throw new ValidationError('Item sem produto.');
      if (!Number.isInteger(it.quantity) || it.quantity <= 0) {
        throw new ValidationError('A quantidade de cada item deve ser um inteiro positivo.');
      }
      if (!(it.unitCost >= 0)) throw new ValidationError('O custo unitário não pode ser negativo.');
    }

    if (!(await this.repo.supplierExists(input.supplierId))) throw new NotFoundError('Fornecedor');
    if (!(await this.repo.productsExist(items.map((i) => i.productId)))) throw new NotFoundError('Produto');

    const id = await this.repo.create({
      supplierId: input.supplierId,
      notes: input.notes?.trim() || null,
      expectedAt: input.expectedAt ? new Date(input.expectedAt) : null,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })),
      createdBy: input.createdBy,
    });
    return { id };
  }
}

@Injectable()
export class ListPurchaseOrdersUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly repo: PurchaseOrderRepository) {}
  execute(): Promise<PurchaseOrderListItem[]> {
    return this.repo.list();
  }
}

@Injectable()
export class GetPurchaseOrderUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly repo: PurchaseOrderRepository) {}
  async execute(id: string): Promise<PurchaseOrderView> {
    const po = await this.repo.findById(id);
    if (!po) throw new NotFoundError('Pedido de compra');
    return po;
  }
}

@Injectable()
export class ReceivePurchaseOrderUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly repo: PurchaseOrderRepository) {}
  async execute(id: string, userId: string | null): Promise<void> {
    const po = await this.repo.findById(id);
    if (!po) throw new NotFoundError('Pedido de compra');
    if (po.status === 'RECEIVED') throw new ValidationError('Este pedido já foi recebido.');
    if (po.status === 'CANCELLED') throw new ValidationError('Pedido cancelado não pode ser recebido.');
    await this.repo.receive(id, userId);
  }
}

@Injectable()
export class CancelPurchaseOrderUseCase {
  constructor(@Inject(PURCHASE_ORDER_REPOSITORY) private readonly repo: PurchaseOrderRepository) {}
  async execute(id: string): Promise<void> {
    const po = await this.repo.findById(id);
    if (!po) throw new NotFoundError('Pedido de compra');
    if (po.status === 'RECEIVED') throw new ValidationError('Pedido recebido não pode ser cancelado.');
    if (po.status === 'CANCELLED') return;
    await this.repo.cancel(id);
  }
}
