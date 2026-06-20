import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_COST_REPOSITORY } from '../finance.tokens';
import { ProductCostRepository, ProductsWithCostPage } from '../domain/product-cost.repository';
import { parseCostCsv } from './cost-csv';

export interface UpsertCostCommand {
  readonly variantId?: string | null;
  readonly sku?: string | null;
  readonly acquisitionCost: number;
  readonly inboundFreight?: number;
  readonly packagingCost?: number;
  readonly otherCost?: number;
  readonly validFrom?: string;
  readonly note?: string | null;
}

export interface CostImportResult {
  readonly applied: number;
  readonly skipped: number;
  readonly unmatchedSkus: readonly string[];
}

/**
 * Capability "custos de produto" do módulo financeiro (Fase 1). Lado de ESCRITA
 * dos custos; o dashboard apenas consome via getCogs. Append-only por vigência.
 */
@Injectable()
export class FinanceService {
  constructor(@Inject(PRODUCT_COST_REPOSITORY) private readonly repo: ProductCostRepository) {}

  listProducts(page: number, pageSize: number, filter: { sku?: string; title?: string; onlyMissing?: boolean }): Promise<ProductsWithCostPage> {
    return this.repo.listProductsWithCost(page, pageSize, filter);
  }

  /** Cria uma nova VIGÊNCIA de custo (o custo vigente é o de maior valid_from). */
  async upsertCost(productId: string, cmd: UpsertCostCommand): Promise<void> {
    await this.repo.createCost({
      productId,
      variantId: cmd.variantId ?? null,
      sku: cmd.sku ?? null,
      acquisitionCost: cmd.acquisitionCost,
      inboundFreight: cmd.inboundFreight ?? 0,
      packagingCost: cmd.packagingCost ?? 0,
      otherCost: cmd.otherCost ?? 0,
      validFrom: cmd.validFrom ? new Date(cmd.validFrom) : undefined,
      note: cmd.note ?? null,
    });
  }

  /** Importa custos em massa por SKU. SKU não encontrado entra em `unmatchedSkus`. */
  async importCsv(csv: string): Promise<CostImportResult> {
    const rows = parseCostCsv(csv);
    let applied = 0;
    const unmatched: string[] = [];
    for (const row of rows) {
      const productId = await this.repo.findProductIdBySku(row.sku);
      if (!productId) {
        unmatched.push(row.sku);
        continue;
      }
      await this.repo.createCost({
        productId,
        sku: row.sku,
        acquisitionCost: row.acquisitionCost,
        inboundFreight: row.inboundFreight,
        packagingCost: row.packagingCost,
        otherCost: row.otherCost,
      });
      applied++;
    }
    return { applied, skipped: unmatched.length, unmatchedSkus: unmatched };
  }
}
