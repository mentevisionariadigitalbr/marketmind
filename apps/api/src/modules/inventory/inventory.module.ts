import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { STOCK_MOVEMENT_REPOSITORY } from './domain/ports/stock-movement.repository';
import { FORECAST_REPOSITORY } from './domain/ports/forecast.repository';
import { PrismaStockMovementRepository } from './infrastructure/persistence/prisma-stock-movement.repository';
import { PrismaForecastRepository } from './infrastructure/persistence/prisma-forecast.repository';
import {
  RegisterAdjustmentUseCase,
  RegisterInventoryCountUseCase,
  ListMovementsUseCase,
  GetReconciliationUseCase,
} from './application/stock-movement.use-cases';
import { GetInventoryForecastUseCase } from './application/inventory-forecast.use-case';
import { InventoryController } from './presentation/http/inventory.controller';

/**
 * Estoque operacional (Fase 1). Dono do RAZÃO de movimentações (ajustes,
 * inventário e — adiante — entradas de compra). O ML segue mestre do disponível;
 * aqui registramos para rastreabilidade/conciliação.
 */
@Module({
  imports: [IamModule],
  controllers: [InventoryController],
  providers: [
    RegisterAdjustmentUseCase,
    RegisterInventoryCountUseCase,
    ListMovementsUseCase,
    GetReconciliationUseCase,
    GetInventoryForecastUseCase,
    { provide: STOCK_MOVEMENT_REPOSITORY, useClass: PrismaStockMovementRepository },
    { provide: FORECAST_REPOSITORY, useClass: PrismaForecastRepository },
  ],
})
export class InventoryModule {}
