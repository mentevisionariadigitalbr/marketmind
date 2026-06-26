export const FORECAST_REPOSITORY = Symbol('ForecastRepository');

/** Dados crus por produto para alimentar a previsão de reposição (cálculo puro). */
export interface ForecastRow {
  productId: string;
  sku: string | null;
  title: string;
  categoryId: string | null;
  available: number;
  supplierId: string | null;
  supplierName: string | null;
  /** Lead time do fornecedor (null → usa o default). */
  leadTimeDays: number | null;
  units30: number;
  units60: number;
  units90: number;
  lastSale: string | null;
}

export interface ForecastRepository {
  /** Produtos da empresa + estoque + vendas 30/60/90d + fornecedor (tenant-scoped). */
  fetchRows(): Promise<ForecastRow[]>;
}
