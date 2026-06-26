import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

// Limite "ilimitado" = null; um número, quando informado, deve ser inteiro >= 0.
export class CreatePlanDto {
  @IsString() @IsNotEmpty() @MaxLength(40) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsInt() @Min(0) priceCents!: number;
  @IsIn(['month', 'year']) interval!: string;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsInt() @Min(0) trialDays?: number;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) maxMarketplaceAccounts?: number | null;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) maxProducts?: number | null;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) historyWindowDays?: number | null;
  @IsOptional() @IsString() stripePriceId?: string;
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) name?: string;
  @IsOptional() @IsInt() @Min(0) priceCents?: number;
  @IsOptional() @IsIn(['month', 'year']) interval?: string;
  @IsOptional() @IsString() @MaxLength(8) currency?: string;
  @IsOptional() @IsInt() @Min(0) trialDays?: number;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) maxMarketplaceAccounts?: number | null;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) maxProducts?: number | null;
  @IsOptional() @ValidateIf((_o, v) => v !== null) @IsInt() @Min(0) historyWindowDays?: number | null;
  @IsOptional() @IsString() stripePriceId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
