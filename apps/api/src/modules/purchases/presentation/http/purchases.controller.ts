import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { CurrentUser } from '../../../iam/presentation/http/current-user.decorator';
import type { AccessClaims } from '../../../iam/domain/ports/token-service.port';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import {
  CreatePurchaseOrderUseCase,
  ListPurchaseOrdersUseCase,
  GetPurchaseOrderUseCase,
  ReceivePurchaseOrderUseCase,
  CancelPurchaseOrderUseCase,
} from '../../application/purchase-order.use-cases';
import { CreatePurchaseOrderDto } from './dto/purchase-order.dto';

/**
 * Compras (Fase 1, Inc.4). Leitura: inventory:read; escrita: inventory:write.
 * Receber um pedido gera ENTRADA no estoque e atualiza o custo médio.
 */
@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
  constructor(
    private readonly createPo: CreatePurchaseOrderUseCase,
    private readonly listPo: ListPurchaseOrdersUseCase,
    private readonly getPo: GetPurchaseOrderUseCase,
    private readonly receivePo: ReceivePurchaseOrderUseCase,
    private readonly cancelPo: CancelPurchaseOrderUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('purchases.create')
  create(@CurrentUser() user: AccessClaims, @Body() dto: CreatePurchaseOrderDto) {
    return this.createPo.execute({ ...dto, createdBy: user.sub });
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  list() {
    return this.listPo.execute();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  get(@Param('id') id: string) {
    return this.getPo.execute(id);
  }

  @Post(':id/receive')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('purchases.receive')
  async receive(@CurrentUser() user: AccessClaims, @Param('id') id: string) {
    await this.receivePo.execute(id, user.sub);
    return { ok: true };
  }

  @Post(':id/cancel')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('purchases.cancel')
  async cancel(@Param('id') id: string) {
    await this.cancelPo.execute(id);
    return { ok: true };
  }
}
