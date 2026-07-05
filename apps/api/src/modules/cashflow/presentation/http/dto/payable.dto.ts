import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePayableDto {
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsString() @MaxLength(280) description?: string;

  @Type(() => Number) @IsNumber() @Min(0.01) amount!: number;

  @IsDateString() dueDate!: string;
}
