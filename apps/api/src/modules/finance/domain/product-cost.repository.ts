/** Porta de persistência de custos de produto (Fase 1). Implementação Prisma. */

export interface ProductCostInput {
  readonly productId: string;
  readonly variantId?: string | null;
  readonly sku?: string | null;
  readonly acquisitionCost: number;
  readonly inboundFreight: number;
  readonly packagingCost: number;
  readonly otherCost: number;
  readonly validFrom?: Date;
  readonly note?: string | null;
}

export interface ProductWithCost {
  readonly productId: string;
  readonly sku: string | null;
  readonly title: string;
  readonly status: string;
  readonly price: number;
  /** Custo unitário vigente hoje, ou null (sem custo cadastrado). */
  readonly currentUnitCost: number | null;
  readonly hasCost: boolean;
}

export interface ProductsWithCostPage {
  readonly items: readonly ProductWithCost[];
  readonly total: number;
}

export interface ProductCostRepository {
  listProductsWithCost(
    page: number,
    pageSize: number,
    filter: { sku?: string; title?: string; onlyMissing?: boolean },
  ): Promise<ProductsWithCostPage>;
  createCost(input: ProductCostInput): Promise<void>;
  findProductIdBySku(sku: string): Promise<string | null>;
}
