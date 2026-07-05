export const PURCHASE_ORDER_REPOSITORY = Symbol('PurchaseOrderRepository');

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';

export interface NewPurchaseOrderItem {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderData {
  supplierId: string;
  notes: string | null;
  expectedAt: Date | null;
  items: NewPurchaseOrderItem[];
  createdBy: string | null;
}

export interface PurchaseOrderItemView {
  id: string;
  productId: string;
  productTitle: string;
  sku: string | null;
  quantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export interface PurchaseOrderView {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  status: PurchaseOrderStatus;
  notes: string | null;
  expectedAt: string | null;
  receivedAt: string | null;
  total: number;
  createdAt: string;
  items: PurchaseOrderItemView[];
}

export interface PurchaseOrderListItem {
  id: string;
  supplierName: string | null;
  status: PurchaseOrderStatus;
  itemsCount: number;
  total: number;
  expectedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
}

/** Pedidos de compra (tenant-scoped via RLS). */
export interface PurchaseOrderRepository {
  supplierExists(supplierId: string): Promise<boolean>;
  /** true se TODOS os productIds existem para a empresa. */
  productsExist(productIds: string[]): Promise<boolean>;
  create(data: CreatePurchaseOrderData): Promise<string>;
  list(): Promise<PurchaseOrderListItem[]>;
  findById(id: string): Promise<PurchaseOrderView | null>;
  /**
   * Recebe o pedido (transacional): para cada item gera ENTRADA no razão de estoque
   * e atualiza o custo do produto por média ponderada; marca o pedido RECEIVED.
   */
  receive(id: string, userId: string | null): Promise<void>;
  /** Cancela um pedido DRAFT/SENT. */
  cancel(id: string): Promise<void>;
}
