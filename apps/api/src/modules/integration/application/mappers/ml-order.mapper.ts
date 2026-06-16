import { MlRawOrder } from '../../domain/ports/mercado-livre.port';
import { NormalizedOrder, OrderStatus } from '../../domain/ports/order-sync.repository';

const STATUS_MAP: Record<string, OrderStatus> = {
  confirmed: 'PENDING',
  payment_required: 'PENDING',
  payment_in_process: 'PENDING',
  partially_paid: 'PENDING',
  paid: 'PAID',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
  invalid: 'CANCELLED',
  refunded: 'REFUNDED',
};

function mapStatus(raw: string): OrderStatus {
  return STATUS_MAP[raw] ?? 'UNKNOWN';
}

function freightOf(order: MlRawOrder): number {
  if (typeof order.shipping?.cost === 'number') return order.shipping.cost;
  const fromPayments = order.payments?.find((p) => typeof p.shipping_cost === 'number');
  return fromPayments?.shipping_cost ?? 0;
}

/** Converte um pedido cru do Mercado Livre no formato normalizado para upsert. */
export function mapMeliOrder(
  order: MlRawOrder,
  ctx: { companyId: string; marketplaceAccountId: string },
): NormalizedOrder {
  const items = order.order_items.map((line) => ({
    externalItemId: line.item.id,
    sku: line.item.seller_sku ?? null,
    title: line.item.title,
    quantity: line.quantity,
    unitPrice: line.unit_price,
    itemCommission: line.sale_fee ?? 0,
  }));

  const commissionAmount = items.reduce((sum, i) => sum + i.itemCommission, 0);

  return {
    companyId: ctx.companyId,
    marketplaceAccountId: ctx.marketplaceAccountId,
    externalId: String(order.id),
    status: mapStatus(order.status),
    currency: order.currency_id ?? 'BRL',
    grossAmount: order.total_amount ?? 0,
    freightAmount: freightOf(order),
    commissionAmount,
    orderedAt: new Date(order.date_created),
    customer: order.buyer
      ? { externalId: String(order.buyer.id), nickname: order.buyer.nickname ?? null }
      : null,
    items,
  };
}
