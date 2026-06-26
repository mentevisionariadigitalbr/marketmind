import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';
import { AuditAction } from '../../../../shared/audit/audit-action.decorator';

import {
  CreateSupplierUseCase,
  UpdateSupplierUseCase,
  ListSuppliersUseCase,
  GetSupplierUseCase,
  AssignProductSupplierUseCase,
  ListProductSuppliersUseCase,
} from '../../application/supplier.use-cases';
import { GetSupplierReportUseCase } from '../../application/supplier-report.use-case';
import { CreateSupplierDto, UpdateSupplierDto, AssignSupplierDto } from './dto/supplier.dto';

class SupplierReportQueryDto {
  @IsOptional()
  @IsIn(['7d', '15d', '30d', '90d', '180d', '365d'])
  preset?: string;
}

/**
 * Fornecedores (Fase 1, Inc.2). Leitura: inventory:read; escrita: inventory:write
 * (reposição). As rotas /products vêm antes de /:id para não colidirem.
 */
@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(
    private readonly createSupplier: CreateSupplierUseCase,
    private readonly updateSupplier: UpdateSupplierUseCase,
    private readonly listSuppliers: ListSuppliersUseCase,
    private readonly getSupplier: GetSupplierUseCase,
    private readonly assignProductSupplier: AssignProductSupplierUseCase,
    private readonly listProductSuppliers: ListProductSuppliersUseCase,
    private readonly supplierReport: GetSupplierReportUseCase,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('suppliers.create')
  create(@Body() dto: CreateSupplierDto) {
    return this.createSupplier.execute(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  list() {
    return this.listSuppliers.execute();
  }

  @Get('products')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  products() {
    return this.listProductSuppliers.execute();
  }

  @Put('products/:productId')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('suppliers.assign-product')
  async assign(@Param('productId') productId: string, @Body() dto: AssignSupplierDto) {
    await this.assignProductSupplier.execute(productId, dto.supplierId ?? null);
    return { ok: true };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_READ)
  get(@Param('id') id: string) {
    return this.getSupplier.execute(id);
  }

  @Get(':id/report')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  report(@Param('id') id: string, @Query() q: SupplierReportQueryDto) {
    return this.supplierReport.execute(id, q.preset);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.INVENTORY_WRITE)
  @AuditAction('suppliers.update')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    await this.updateSupplier.execute(id, dto);
    return { ok: true };
  }
}
