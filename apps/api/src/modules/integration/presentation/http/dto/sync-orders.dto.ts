import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class SyncOrdersDto {
  @IsUUID()
  accountId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
