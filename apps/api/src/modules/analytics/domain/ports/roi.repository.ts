export const ROI_REPOSITORY = Symbol('RoiRepository');

/** Agregados crus por produto (vendas no período) para o cálculo de ROI/margem. */
export interface ProductRoiRaw {
  productId: string;
  sku: string | null;
  internalSku: string | null;
  title: string;
  internalTitle: string | null;
  price: number | null;
  promoPrice: number | null;
  revenue: number;
  units: number;
  unitCost: number | null;
}

/** Agregados crus por fornecedor: vendas geradas vs valor comprado (recebido). */
export interface SupplierRoiRaw {
  supplierId: string;
  name: string;
  revenue: number;
  cogs: number;
  productsSold: number;
  purchased: number;
}

export interface RoiRepository {
  productRoi(days: number): Promise<ProductRoiRaw[]>;
  supplierRoi(days: number): Promise<SupplierRoiRaw[]>;
}
