import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { PURCHASE_ORDER_REPOSITORY } from './domain/ports/purchase-order.repository';
import { PrismaPurchaseOrderRepository } from './infrastructure/persistence/prisma-purchase-order.repository';
import {
  CreatePurchaseOrderUseCase,
  ListPurchaseOrdersUseCase,
  GetPurchaseOrderUseCase,
  ReceivePurchaseOrderUseCase,
  CancelPurchaseOrderUseCase,
} from './application/purchase-order.use-cases';
import { PurchasesController } from './presentation/http/purchases.controller';

/**
 * Compras (Fase 1, Inc.4). Fecha o ciclo: previsão → pedido → recebimento →
 * ENTRADA no razão + custo médio ponderado. Habilita o ROI por fornecedor (Fase 2).
 */
@Module({
  imports: [IamModule],
  controllers: [PurchasesController],
  providers: [
    CreatePurchaseOrderUseCase,
    ListPurchaseOrdersUseCase,
    GetPurchaseOrderUseCase,
    ReceivePurchaseOrderUseCase,
    CancelPurchaseOrderUseCase,
    { provide: PURCHASE_ORDER_REPOSITORY, useClass: PrismaPurchaseOrderRepository },
  ],
})
export class PurchasesModule {}
