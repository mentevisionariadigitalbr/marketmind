import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import { GetProductUseCase, UpdateProductUseCase } from '../../application/product.use-cases';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * Edição manual de produto (Fase 2, Inc.1). Leitura: inventory:read; escrita:
 * inventory:write. Campos manuais são overrides internos (sync-safe).
 */
@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(
    private readonly getProduct: GetProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
  ) {}

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  get(@Param('id') id: string) {
    return this.getProduct.execute(id);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('products.update')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    await this.updateProduct.execute(id, dto);
    return { ok: true };
  }
}
