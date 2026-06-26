import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { CurrentUser } from '../../../iam/presentation/http/current-user.decorator';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import {
  CreatePayableUseCase,
  ListPayablesUseCase,
  PayPayableUseCase,
  ListReceivablesUseCase,
  GetCashflowProjectionUseCase,
} from '../../application/cashflow.use-cases';
import { CreatePayableDto } from './dto/payable.dto';

/** Fluxo de caixa (Fase 3, Inc.1). Leitura: finance:read; escrita: finance:write. */
@ApiTags('Cashflow')
@ApiBearerAuth()
@Controller('cashflow')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashflowController {
  constructor(
    private readonly projection: GetCashflowProjectionUseCase,
    private readonly listPayables: ListPayablesUseCase,
    private readonly createPayable: CreatePayableUseCase,
    private readonly payPayable: PayPayableUseCase,
    private readonly listReceivables: ListReceivablesUseCase,
  ) {}

  @Get('projection')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  getProjection() {
    return this.projection.execute();
  }

  @Get('payables')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  payables() {
    return this.listPayables.execute();
  }

  @Post('payables')
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('cashflow.payable.create')
  create(@CurrentUser() user: AccessClaims, @Body() dto: CreatePayableDto) {
    return this.createPayable.execute({ ...dto, createdBy: user.sub });
  }

  @Post('payables/:id/pay')
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('cashflow.payable.pay')
  async pay(@Param('id') id: string) {
    await this.payPayable.execute(id);
    return { ok: true };
  }

  @Get('receivables')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  receivables(@Query('limit') limit?: string) {
    return this.listReceivables.execute(limit ? Number(limit) : undefined);
  }
}
