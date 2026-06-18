import { mapMeliOrder } from './ml-order.mapper';
import { MlRawOrder } from '../../domain/ports/mercado-livre.port';

const RAW: MlRawOrder = {
  id: 2000003,
  status: 'paid',
  date_created: '2026-06-10T12:00:00.000Z',
  total_amount: 150.5,
  currency_id: 'BRL',
  order_items: [
    { item: { id: 'MLB1', title: 'Produto A', seller_sku: 'SKU-A' }, quantity: 2, unit_price: 50, sale_fee: 5 },
    { item: { id: 'MLB2', title: 'Produto B' }, quantity: 1, unit_price: 50.5, sale_fee: 2.5 },
  ],
  buyer: { id: 999, nickname: 'COMPRADOR' },
  shipping: { cost: 20 },
};

describe('mapMeliOrder', () => {
  it('normaliza pedido, status, frete, comissão e cliente', () => {
    const out = mapMeliOrder(RAW, { companyId: 'c1', marketplaceAccountId: 'a1' });

    expect(out).toMatchObject({
      companyId: 'c1',
      marketplaceAccountId: 'a1',
      externalId: '2000003',
      status: 'PAID',
      currency: 'BRL',
      grossAmount: 150.5,
      freightAmount: 20,
      commissionAmount: 7.5, // 5 + 2.5
    });
    expect(out.orderedAt.toISOString()).toBe('2026-06-10T12:00:00.000Z');
    expect(out.customer).toEqual({ externalId: '999', nickname: 'COMPRADOR' });
    expect(out.items).toHaveLength(2);
    expect(out.items[0].sku).toBe('SKU-A');
    expect(out.items[1].sku).toBeNull();
  });

  it('mapeia status desconhecido para UNKNOWN e frete via payments', () => {
    const out = mapMeliOrder(
      { ...RAW, status: 'weird_status', shipping: undefined, payments: [{ shipping_cost: 12 }] },
      { companyId: 'c1', marketplaceAccountId: 'a1' },
    );
    expect(out.status).toBe('UNKNOWN');
    expect(out.freightAmount).toBe(12);
  });

  it('aceita pedido sem comprador', () => {
    const out = mapMeliOrder({ ...RAW, buyer: undefined }, { companyId: 'c1', marketplaceAccountId: 'a1' });
    expect(out.customer).toBeNull();
  });
});
