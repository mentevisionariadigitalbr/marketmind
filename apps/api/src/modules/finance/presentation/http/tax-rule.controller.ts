import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { TaxRuleService } from '../../application/tax-rule.service';
import { UpsertTaxRuleDto } from './dto/tax-rule.dto';

/** Alíquotas de imposto (Fase 2). Leitura finance:read; escrita finance:write. */
@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance/tax-rules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TaxRuleController {
  constructor(private readonly taxRules: TaxRuleService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  list() {
    return this.taxRules.list();
  }

  @Put()
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('finance.tax_rule.upsert')
  upsert(@Body() dto: UpsertTaxRuleDto) {
    return this.taxRules.upsert(dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('finance.tax_rule.delete')
  async remove(@Param('id') id: string) {
    const deleted = await this.taxRules.delete(id);
    return { deleted };
  }
}
