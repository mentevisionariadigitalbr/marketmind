import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export const TAX_REGIMES = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI'] as const;

export class UpdateCompanyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) taxId?: string;
  @ApiPropertyOptional({ enum: TAX_REGIMES })
  @IsOptional()
  @IsEnum(TAX_REGIMES)
  taxRegime?: (typeof TAX_REGIMES)[number];
}
