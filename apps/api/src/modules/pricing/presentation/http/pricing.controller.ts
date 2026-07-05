import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { JwtAuthGuard } from '../../../iam/presentation/http/jwt-auth.guard';
import { PermissionsGuard } from '../../../iam/presentation/http/permissions.guard';
import { RequirePermissions } from '../../../iam/presentation/http/require-permissions.decorator';
import { PERMISSIONS } from '../../../iam/domain/permissions';

import { GetPricingUseCase } from '../../application/pricing.use-cases';

class PricingQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(0.95) targetMargin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) commissionRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) taxRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) freight?: number;
}

/** Precificação (Fase 3, Inc.2). Leitura: pricing:read. */
@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('pricing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PricingController {
  constructor(private readonly pricing: GetPricingUseCase) {}

  @Get('products')
  @RequirePermissions(PERMISSIONS.PRICING_READ)
  products(@Query() q: PricingQueryDto) {
    return this.pricing.execute(q);
  }
}
