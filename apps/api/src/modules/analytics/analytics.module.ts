import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { ROI_REPOSITORY } from './domain/ports/roi.repository';
import { PrismaRoiRepository } from './infrastructure/persistence/prisma-roi.repository';
import { GetProductRoiUseCase, GetSupplierRoiUseCase } from './application/roi.use-cases';
import { RoiController } from './presentation/http/roi.controller';

/**
 * Analytics (Fase 2, Inc.2). ROI por produto (sobre COGS) e por fornecedor (sobre
 * o valor comprado), além da margem prospectiva pelo preço efetivo.
 */
@Module({
  imports: [IamModule],
  controllers: [RoiController],
  providers: [
    GetProductRoiUseCase,
    GetSupplierRoiUseCase,
    { provide: ROI_REPOSITORY, useClass: PrismaRoiRepository },
  ],
})
export class AnalyticsModule {}
