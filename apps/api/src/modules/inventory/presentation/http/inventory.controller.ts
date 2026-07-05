import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { CurrentUser } from '../../../iam/presentation/http/current-user.decorator';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import {
  RegisterAdjustmentUseCase,
  RegisterInventoryCountUseCase,
  ListMovementsUseCase,
  GetReconciliationUseCase,
} from '../../application/stock-movement.use-cases';
import { GetInventoryForecastUseCase } from '../../application/inventory-forecast.use-case';
import { AdjustStockDto, InventoryCountDto, ListMovementsQueryDto } from './dto/stock-movement.dto';
import { ForecastQueryDto } from './dto/forecast.dto';

/** Estoque operacional (Fase 1, Inc.1). Leitura: inventory:read; escrita: inventory:write. */
@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly adjust: RegisterAdjustmentUseCase,
    private readonly inventoryCount: RegisterInventoryCountUseCase,
    private readonly movements: ListMovementsUseCase,
    private readonly reconciliation: GetReconciliationUseCase,
    private readonly forecast: GetInventoryForecastUseCase,
  ) {}

  @Post('adjustments')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('inventory.adjustment')
  async createAdjustment(@CurrentUser() user: AccessClaims, @Body() dto: AdjustStockDto) {
    await this.adjust.execute({ productId: dto.productId, quantity: dto.quantity, reason: dto.reason, userId: user.sub });
    return { ok: true };
  }

  @Post('inventory-counts')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('inventory.count')
  async createCount(@CurrentUser() user: AccessClaims, @Body() dto: InventoryCountDto) {
    await this.inventoryCount.execute({
      productId: dto.productId,
      countedQuantity: dto.countedQuantity,
      reason: dto.reason,
      userId: user.sub,
    });
    return { ok: true };
  }

  @Get('movements')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  listMovements(@Query() q: ListMovementsQueryDto) {
    return this.movements.execute(q.productId, q.limit);
  }

  @Get('reconciliation')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  getReconciliation() {
    return this.reconciliation.execute();
  }

  @Get('forecast')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  getForecast(@Query() q: ForecastQueryDto) {
    return this.forecast.execute(q);
  }
}
