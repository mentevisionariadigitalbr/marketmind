import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @IsOptional() @IsString() @MaxLength(300) internalTitle?: string;
  @IsOptional() @IsString() @MaxLength(120) brand?: string;
  @IsOptional() @IsString() @MaxLength(80) internalSku?: string;
  @IsOptional() @IsString() @MaxLength(1000) internalNotes?: string;

  // null limpa o preço promocional.
  @IsOptional() @ValidateIf((_, v) => v !== null) @Type(() => Number) @IsNumber() @Min(0) promoPrice?: number | null;

  // null desvincula o fornecedor.
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUUID() supplierId?: string | null;
}
