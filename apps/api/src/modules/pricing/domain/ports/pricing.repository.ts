export const PRICING_REPOSITORY = Symbol('PricingRepository');

export interface PricingProductRaw {
  productId: string;
  sku: string | null;
  internalSku: string | null;
  title: string;
  internalTitle: string | null;
  price: number | null;
  promoPrice: number | null;
  unitCost: number;
  units: number;
}

export interface PricingDefaultsRaw {
  /** Comissão média = comissão / receita bruta (pedidos pagos). */
  commissionRate: number;
  totalFreight: number;
  totalUnits: number;
}

export interface PricingRepository {
  /** Produtos COM custo cadastrado (a precificação exige custo). */
  products(): Promise<PricingProductRaw[]>;
  defaults(): Promise<PricingDefaultsRaw>;
}
