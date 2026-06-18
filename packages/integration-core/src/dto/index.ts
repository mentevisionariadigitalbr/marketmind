/**
 * DTOs compartilhados de integração — contrato único entre api, workers e web.
 * Tipos puros (sem dependência de framework/ORM).
 */

export interface MarketplaceAccountDTO {
  id: string;
  companyId: string;
  marketplaceCode: string;
  externalUserId: string;
  nickname: string | null;
  status: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'ERROR';
}

export interface OrderItemDTO {
  externalItemId: string;
  sku: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  itemCommission: number;
}

export interface OrderDTO {
  externalId: string;
  marketplaceAccountId: string;
  status: string;
  currency: string;
  grossAmount: number;
  freightAmount: number;
  commissionAmount: number;
  orderedAt: string;
  items: OrderItemDTO[];
}

export interface VariationDTO {
  externalId: string;
  sku: string | null;
  gtin: string | null;
  color: string | null;
  size: string | null;
  price: number | null;
  availableQuantity: number;
}

export interface ProductDTO {
  externalId: string;
  marketplaceAccountId: string;
  sku: string | null;
  title: string;
  status: string;
  price: number | null;
  currency: string;
  availableQuantity: number;
  categoryId: string | null;
  variants: VariationDTO[];
  images: Array<{ externalId: string; url: string; position: number }>;
}

export interface InventoryDTO {
  variantExternalId: string;
  available: number;
  reserved: number;
}

export interface PriceDTO {
  productExternalId: string;
  amount: number;
  currency: string;
  capturedAt: string;
}

export interface CategoryDTO {
  externalId: string;
  name: string;
  parentExternalId: string | null;
  pathFromRoot: Array<{ id: string; name: string }>;
}
