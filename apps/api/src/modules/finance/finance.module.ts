import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { PRODUCT_COST_REPOSITORY } from './finance.tokens';
import { FinanceService } from './application/finance.service';
import { PrismaProductCostRepository } from './infrastructure/prisma-product-cost.repository';
import { FinanceController } from './presentation/http/finance.controller';

/**
 * Módulo financeiro (Fase 1: custos de produto). Dono da ESCRITA de custos;
 * o dashboard consome o custo via DASHBOARD_QUERY_PORT.getCogs. Fase 2 adiciona
 * despesas/impostos/DRE aqui.
 */
@Module({
  imports: [IamModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    { provide: PRODUCT_COST_REPOSITORY, useClass: PrismaProductCostRepository },
  ],
})
export class FinanceModule {}
