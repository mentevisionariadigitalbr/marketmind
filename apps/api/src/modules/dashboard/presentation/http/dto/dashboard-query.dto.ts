import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const PERIOD_PRESETS = ['7d', '15d', '30d', '90d', '180d', '365d', 'today', 'mtd', 'ytd', 'custom'] as const;
export type PeriodPresetDto = (typeof PERIOD_PRESETS)[number];

/** Filtros de período comuns a todos os endpoints. */
export class PeriodQueryDto {
  @ApiPropertyOptional({ enum: PERIOD_PRESETS, default: '30d' })
  @IsOptional()
  @IsEnum(PERIOD_PRESETS)
  preset: PeriodPresetDto = '30d';

  @ApiPropertyOptional({ description: 'Início (ISO) — obrigatório quando preset=custom' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fim (ISO) — obrigatório quando preset=custom' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class TopProductsQueryDto extends PeriodQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;
}

export class ProductsQueryDto extends PeriodQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() marketplaceAccountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minStock?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxStock?: number;
}
