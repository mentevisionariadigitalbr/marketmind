import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CASHFLOW_REPOSITORY } from './domain/ports/cashflow.repository';
import { PrismaCashflowRepository } from './infrastructure/persistence/prisma-cashflow.repository';
import {
  CreatePayableUseCase,
  ListPayablesUseCase,
  PayPayableUseCase,
  ListReceivablesUseCase,
  GetCashflowProjectionUseCase,
} from './application/cashflow.use-cases';
import { CashflowController } from './presentation/http/cashflow.controller';

/**
 * Fluxo de caixa (Fase 3, Inc.1). Contas a pagar (das compras + manuais), a receber
 * (líquido das vendas) e a projeção semanal de caixa.
 */
@Module({
  imports: [IamModule],
  controllers: [CashflowController],
  providers: [
    CreatePayableUseCase,
    ListPayablesUseCase,
    PayPayableUseCase,
    ListReceivablesUseCase,
    GetCashflowProjectionUseCase,
    { provide: CASHFLOW_REPOSITORY, useClass: PrismaCashflowRepository },
  ],
})
export class CashflowModule {}
