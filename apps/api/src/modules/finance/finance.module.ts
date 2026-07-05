import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PRODUCT_COST_REPOSITORY, EXPENSE_REPOSITORY, TAX_RULE_REPOSITORY } from './finance.tokens';
import { FinanceService } from './application/finance.service';
import { ExpenseService } from './application/expense.service';
import { TaxRuleService } from './application/tax-rule.service';
import { DreService } from './application/dre.service';
import { PrismaProductCostRepository } from './infrastructure/prisma-product-cost.repository';
import { PrismaExpenseRepository } from './infrastructure/prisma-expense.repository';
import { PrismaTaxRuleRepository } from './infrastructure/prisma-tax-rule.repository';
import { FinanceController } from './presentation/http/finance.controller';
import { ExpenseController } from './presentation/http/expense.controller';
import { TaxRuleController } from './presentation/http/tax-rule.controller';
import { DreController } from './presentation/http/dre.controller';

/**
 * Módulo financeiro. Dono da ESCRITA financeira: custos (Fase 1), despesas
 * (Fase 2), e adiante impostos/DRE. O dashboard consome os agregados via
 * DASHBOARD_QUERY_PORT (getCogs, getOperatingExpenses, ...).
 */
@Module({
  imports: [IamModule, DashboardModule],
  controllers: [FinanceController, ExpenseController, TaxRuleController, DreController],
  providers: [
    FinanceService,
    ExpenseService,
    TaxRuleService,
    DreService,
    { provide: PRODUCT_COST_REPOSITORY, useClass: PrismaProductCostRepository },
    { provide: EXPENSE_REPOSITORY, useClass: PrismaExpenseRepository },
    { provide: TAX_RULE_REPOSITORY, useClass: PrismaTaxRuleRepository },
  ],
})
export class FinanceModule {}
