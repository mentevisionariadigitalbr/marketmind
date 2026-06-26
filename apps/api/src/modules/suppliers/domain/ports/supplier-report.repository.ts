export const SUPPLIER_REPORT_REPOSITORY = Symbol('SupplierReportRepository');

/** Linha crua por produto do fornecedor (vendas no período + estoque + custo). */
export interface SupplierReportProductRaw {
  productId: string;
  sku: string | null;
  internalSku: string | null;
  title: string;
  internalTitle: string | null;
  available: number;
  unitsSold: number;
  revenue: number;
  unitCost: number | null;
}

export interface SupplierReportRepository {
  products(supplierId: string, days: number): Promise<SupplierReportProductRaw[]>;
  /** Valor comprado (pedidos recebidos) do fornecedor no período. */
  purchased(supplierId: string, days: number): Promise<number>;
}
