import { mapMeliItem } from './ml-item.mapper';
import { MlRawItem } from '../../domain/ports/mercado-livre.port';
import { sampleItem } from '../__fixtures__/integration-fakes';

const ctx = { companyId: 'c1', marketplaceAccountId: 'a1' };

describe('mapMeliItem', () => {
  it('mapeia produto com variações (sku/cor/tamanho/gtin/atributos/imagens)', () => {
    const out = mapMeliItem(sampleItem('MLB1'), ctx);

    expect(out).toMatchObject({
      companyId: 'c1',
      marketplaceAccountId: 'a1',
      externalId: 'MLB1',
      title: 'Produto MLB1',
      status: 'active',
      price: 100,
      currency: 'BRL',
      categoryId: 'MLB1',
    });
    expect(out.variants).toHaveLength(2);
    expect(out.variants[0]).toMatchObject({
      externalId: '1',
      sku: 'SKU-MLB1-P',
      color: 'Azul',
      size: 'P',
      availableQuantity: 6,
    });
    expect(out.images).toEqual([{ externalId: 'pic1', url: 'https://img/1.jpg', position: 0 }]);
  });

  it('cria variante sintética para item sem variações', () => {
    const item: MlRawItem = {
      id: 'MLB9',
      title: 'Sem variação',
      price: 50,
      available_quantity: 7,
      status: 'active',
      seller_sku: 'SKU-9',
      attributes: [{ id: 'GTIN', value_name: '111' }],
    };
    const out = mapMeliItem(item, ctx);

    expect(out.variants).toHaveLength(1);
    expect(out.variants[0]).toMatchObject({
      externalId: 'MLB9', // = id do item
      sku: 'SKU-9',
      gtin: '111',
      availableQuantity: 7,
    });
  });
});
