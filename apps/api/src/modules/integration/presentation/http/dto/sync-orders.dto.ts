import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class SyncOrdersDto {
  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  // Offset de paginação (ML retorna 50 por página) — permite importar todo o histórico.
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}
