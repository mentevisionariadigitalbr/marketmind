import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @IsUUID()
  productId!: string;

  /** Sinalizado: positivo entra, negativo sai. Não pode ser zero. */
  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}

export class InventoryCountDto {
  @IsUUID()
  productId!: string;

  /** Contagem física absoluta (>= 0). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  countedQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}

export class ListMovementsQueryDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
