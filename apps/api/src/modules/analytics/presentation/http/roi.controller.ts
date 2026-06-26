import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';

import { GetProductRoiUseCase, GetSupplierRoiUseCase } from '../../application/roi.use-cases';

class RoiQueryDto {
  @IsOptional()
  @IsIn(['7d', '15d', '30d', '90d', '180d', '365d'])
  preset?: string;
}

/** ROI (Fase 2, Inc.2). Leitura: finance:read (análise financeira). */
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics/roi')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoiController {
  constructor(
    private readonly productRoi: GetProductRoiUseCase,
    private readonly supplierRoi: GetSupplierRoiUseCase,
  ) {}

  @Get('products')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  products(@Query() q: RoiQueryDto) {
    return this.productRoi.execute(q.preset);
  }

  @Get('suppliers')
  @RequirePermissions(PERMISSIONS.FINANCE_READ)
  suppliers(@Query() q: RoiQueryDto) {
    return this.supplierRoi.execute(q.preset);
  }
}
