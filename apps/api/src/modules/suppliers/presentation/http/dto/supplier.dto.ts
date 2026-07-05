import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional() @IsString() @MaxLength(160) contactName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) document?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadTimeDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) paymentTermDays?: number;

  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateSupplierDto {
  @IsOptional() @IsString() @MaxLength(160) name?: string;
  @IsOptional() @IsString() @MaxLength(160) contactName?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  // Permite limpar o e-mail enviando string vazia.
  @IsOptional() @ValidateIf((_, v) => v !== '') @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) document?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadTimeDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) paymentTermDays?: number;

  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class AssignSupplierDto {
  // null/ausente = desvincular.
  @IsOptional() @IsUUID() supplierId?: string | null;
}
