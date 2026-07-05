import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { FinanceService } from '../../application/finance.service';
import { ListCostsQueryDto, UpsertCostDto, ImportCostsDto } from './dto/cost.dto';

/** Custos de produto (Fase 1). Leitura: finance:read; escrita: finance:write. */
@ApiTags('Finance')
@ApiBearerAuth()
@Controller('costs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('products')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  listProducts(@Query() q: ListCostsQueryDto) {
    return this.finance.listProducts(q.page, q.pageSize, { sku: q.sku, title: q.title, onlyMissing: q.onlyMissing });
  }

  @Put('products/:productId')
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('finance.cost.upsert')
  async upsert(@Param('productId') productId: string, @Body() dto: UpsertCostDto) {
    await this.finance.upsertCost(productId, dto);
    return { ok: true };
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.FINANCE_WRITE)
  @AuditAction('finance.cost.import')
  import(@Body() dto: ImportCostsDto) {
    return this.finance.importCsv(dto.csv);
  }
}
