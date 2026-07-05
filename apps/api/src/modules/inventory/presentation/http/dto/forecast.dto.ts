import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ForecastQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([30, 60, 90, 120])
  horizon?: number;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsIn(['critico', 'atencao', 'saudavel'])
  risk?: 'critico' | 'atencao' | 'saudavel';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  onlyNeeded?: boolean;
}
