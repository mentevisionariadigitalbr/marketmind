import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export const TAX_REGIMES = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI'] as const;

export class UpsertTaxRuleDto {
  @ApiProperty({ enum: TAX_REGIMES })
  @IsEnum(TAX_REGIMES)
  regime!: (typeof TAX_REGIMES)[number];

  @ApiPropertyOptional({ description: 'Categoria (id). Omitir = alíquota padrão do regime.' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.06, description: 'Alíquota efetiva (fração 0..1)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  rate!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
