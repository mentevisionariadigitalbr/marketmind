export const ORDER_SYNC_REPOSITORY = Symbol('OrderSyncRepository');

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'UNKNOWN';

export interface NormalizedOrderItem {
  externalItemId: string;
  sku: string | null;
  title: string;
  quantity: number;
  unitPrice: number;
  itemCommission: number;
}

export interface NormalizedOrder {
  companyId: string;
  marketplaceAccountId: string;
  externalId: string;
  status: OrderStatus;
  currency: string;
  grossAmount: number;
  freightAmount: number;
  commissionAmount: number;
  orderedAt: Date;
  customer: { externalId: string; nickname: string | null } | null;
  items: NormalizedOrderItem[];
}

export interface UpsertOrderResult {
  created: boolean;
}

export interface OrderSyncRepository {
  /** Upsert idempotente do pedido + itens (chave natural: account + externalId). */
  upsertOrder(order: NormalizedOrder): Promise<UpsertOrderResult>;
}
