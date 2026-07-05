import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export const PERIOD_PRESETS = ['7d', '30d', '90d', '180d', '365d', 'today', 'mtd', 'ytd', 'custom'] as const;

export class DrePeriodQueryDto {
  @ApiPropertyOptional({ enum: PERIOD_PRESETS, default: 'mtd' })
  @IsOptional() @IsEnum(PERIOD_PRESETS)
  preset: (typeof PERIOD_PRESETS)[number] = 'mtd';

  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}

class DeductionsDto {
  @ApiProperty() commission!: number;
  @ApiProperty() freight!: number;
  @ApiProperty() taxes!: number;
  @ApiProperty() total!: number;
}

export class DreResponseDto {
  @ApiProperty() periodFrom!: string;
  @ApiProperty() periodTo!: string;
  @ApiProperty() grossRevenue!: number;
  @ApiProperty({ type: DeductionsDto }) deductions!: DeductionsDto;
  @ApiProperty() netRevenue!: number;
  @ApiProperty() cogs!: number;
  @ApiProperty() grossProfit!: number;
  @ApiProperty() operatingExpenses!: number;
  @ApiProperty() netProfit!: number;
  @ApiProperty() netMarginPct!: number;
  @ApiProperty({ description: 'Cobertura de custo (0..1); <1 = CMV/lucro parciais' }) costCoveragePct!: number;
  @ApiProperty() effectiveTaxRatePct!: number;
}
