import { ApiProperty } from '@nestjs/swagger';

/** Classes de documentação Swagger. Estruturalmente compatíveis com os DTOs de
 *  @marketmind/dashboard-core (o controller devolve os objetos do service). */

class TrendDto {
  @ApiProperty({ enum: ['up', 'down', 'flat'] }) direction!: string;
  @ApiProperty({ example: 0.12, description: 'Variação como fração' }) changePct!: number;
}

export class KpiCardDto {
  @ApiProperty({ example: 'revenue.month' }) key!: string;
  @ApiProperty({ example: 'Receita (mês)' }) label!: string;
  @ApiProperty({ enum: ['BRL', 'count', 'percent', 'ratio', 'days'] }) unit!: string;
  @ApiProperty({ example: 15230.5 }) value!: number;
  @ApiProperty({ enum: ['available', 'needs-table', 'needs-integration'] }) availability!: string;
  @ApiProperty({ type: TrendDto, required: false }) trend?: TrendDto;
}

export class OverviewResponseDto {
  @ApiProperty() generatedAt!: string;
  @ApiProperty() periodFrom!: string;
  @ApiProperty() periodTo!: string;
  @ApiProperty({ type: [KpiCardDto] }) kpis!: KpiCardDto[];
  @ApiProperty({ example: 0.8, description: 'Fração (0..1) das vendas com custo cadastrado' }) costCoveragePct!: number;
}

export class RevenueResponseDto {
  @ApiProperty() revenue!: number;
  @ApiProperty() orders!: number;
  @ApiProperty() averageTicket!: number;
  @ApiProperty() contributionMarginPct!: number;
  @ApiProperty() growthPct!: number;
  @ApiProperty({ description: 'Lucro bruto (receita coberta − COGS)' }) grossProfit!: number;
  @ApiProperty() grossMarginPct!: number;
  @ApiProperty({ example: 0.8, description: 'Fração (0..1) das vendas com custo' }) costCoveragePct!: number;
}

export class TimelinePointDto {
  @ApiProperty({ example: '2026-06-15' }) bucket!: string;
  @ApiProperty() revenue!: number;
  @ApiProperty() orders!: number;
  @ApiProperty() unitsSold!: number;
}

export class CategoryResponseDto {
  @ApiProperty() categoryId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() revenue!: number;
  @ApiProperty() sharePct!: number;
}

class AbcEntryDto {
  @ApiProperty() key!: string;
  @ApiProperty() revenue!: number;
  @ApiProperty() sharePct!: number;
  @ApiProperty() cumulativePct!: number;
  @ApiProperty({ enum: ['A', 'B', 'C'] }) abcClass!: string;
}

export class AbcResponseDto {
  @ApiProperty({ type: [AbcEntryDto] }) entries!: AbcEntryDto[];
  @ApiProperty({ example: { A: 8, B: 20, C: 60 } }) counts!: Record<string, number>;
}

export class InventoryResponseDto {
  @ApiProperty() activeProducts!: number;
  @ApiProperty() productsWithoutStock!: number;
  @ApiProperty() valueAtPrice!: number;
  @ApiProperty({ nullable: true, description: 'null quando nenhum SKU em estoque tem custo' }) valueAtCost!: number | null;
  @ApiProperty({ example: 0.8, description: 'Fração (0..1) do estoque (a preço) com custo' }) valueAtCostCoveragePct!: number;
  @ApiProperty() turnover!: number;
  @ApiProperty() coverageDays!: number;
}

export class TopProductResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ nullable: true }) sku!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty() revenue!: number;
  @ApiProperty() unitsSold!: number;
  @ApiProperty() sharePct!: number;
}

export class ProductRowResponseDto {
  @ApiProperty() productId!: string;
  @ApiProperty({ nullable: true }) sku!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) thumbnail!: string | null;
  @ApiProperty({ nullable: true }) categoryId!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() price!: number;
  @ApiProperty() stock!: number;
  @ApiProperty() revenue!: number;
  @ApiProperty() unitsSold!: number;
  @ApiProperty({ nullable: true }) profit!: number | null;
  @ApiProperty({ nullable: true }) marginPct!: number | null;
}

export class ProductsPageResponseDto {
  @ApiProperty({ type: [ProductRowResponseDto] }) items!: ProductRowResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

class AlertDto {
  @ApiProperty() type!: string;
  @ApiProperty({ enum: ['critical', 'warning', 'info'] }) severity!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() productId!: string;
  @ApiProperty({ nullable: true }) sku!: string | null;
  @ApiProperty() value!: number;
}

export class AlertsResponseDto {
  @ApiProperty() generatedAt!: string;
  @ApiProperty({ type: [AlertDto] }) alerts!: AlertDto[];
  @ApiProperty({ example: { critical: 2, warning: 5, info: 3 } }) counts!: Record<string, number>;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded', 'stale'] }) status!: string;
  @ApiProperty({ nullable: true }) lastRefreshAt!: string | null;
  @ApiProperty() cacheHit!: boolean;
}
