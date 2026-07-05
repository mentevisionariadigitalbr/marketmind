import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export const EXPENSE_KINDS = ['FIXED', 'VARIABLE'] as const;
export const EXPENSE_RECURRENCES = ['NONE', 'MONTHLY', 'YEARLY'] as const;

export class ListExpensesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;

  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Aluguel' }) @IsString() category!: string;

  @ApiProperty({ enum: EXPENSE_KINDS }) @IsEnum(EXPENSE_KINDS) kind!: (typeof EXPENSE_KINDS)[number];

  @ApiProperty({ minimum: 0, example: 2500 }) @Type(() => Number) @IsNumber() @Min(0) amount!: number;

  @ApiProperty({ enum: EXPENSE_RECURRENCES, default: 'NONE' })
  @IsEnum(EXPENSE_RECURRENCES)
  recurrence!: (typeof EXPENSE_RECURRENCES)[number];

  @ApiProperty({ description: 'Início/competência (ISO)' }) @IsString() startsOn!: string;

  @ApiPropertyOptional({ description: 'Fim da vigência (ISO) — só recorrentes' }) @IsOptional() @IsString() endsOn?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
