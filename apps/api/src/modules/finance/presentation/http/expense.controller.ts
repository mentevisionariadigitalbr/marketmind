import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { ExpenseService } from '../../application/expense.service';
import { ListExpensesQueryDto, CreateExpenseDto } from './dto/expense.dto';

/** Despesas operacionais (Fase 2). Leitura finance:read; escrita finance:write. */
@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance/expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseController {
  constructor(private readonly expenses: ExpenseService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  list(@Query() q: ListExpensesQueryDto) {
    return this.expenses.list(q.page, q.pageSize, { category: q.category });
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('finance.expense.create')
  create(@Body() dto: CreateExpenseDto) {
    return this.expenses.create(dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('finance.expense.delete')
  async remove(@Param('id') id: string) {
    const deleted = await this.expenses.delete(id);
    return { deleted };
  }
}
