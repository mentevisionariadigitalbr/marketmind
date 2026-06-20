import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListCostsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;

  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;

  @ApiPropertyOptional({ description: 'Apenas produtos SEM custo cadastrado' })
  @IsOptional() @Type(() => Boolean) @IsBoolean() onlyMissing?: boolean;
}

export class UpsertCostDto {
  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsNumber() @Min(0) acquisitionCost!: number;
  @ApiPropertyOptional({ minimum: 0, default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) inboundFreight?: number;
  @ApiPropertyOptional({ minimum: 0, default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packagingCost?: number;
  @ApiPropertyOptional({ minimum: 0, default: 0 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) otherCost?: number;
  @ApiPropertyOptional({ description: 'Variante específica (default: custo do produto)' }) @IsOptional() @IsString() variantId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiPropertyOptional({ description: 'Início da vigência (ISO). Default: agora' }) @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ImportCostsDto {
  @ApiProperty({ description: 'CSV com cabeçalho: sku,acquisition_cost,inbound_freight,packaging_cost,other_cost' })
  @IsString()
  csv!: string;
}
