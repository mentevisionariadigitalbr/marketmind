import { MlRawItem, MlRawAttribute } from '../../domain/ports/mercado-livre.port';
import {
  NormalizedImage,
  NormalizedProduct,
  NormalizedVariant,
} from '../../domain/ports/catalog-sync.repository';

function attrValue(attrs: MlRawAttribute[] | undefined, id: string): string | null {
  return attrs?.find((a) => a.id === id)?.value_name ?? null;
}

function gtinOf(attrs: MlRawAttribute[] | undefined): string | null {
  return attrValue(attrs, 'GTIN') ?? attrValue(attrs, 'EAN');
}

function attrsToRecord(attrs: MlRawAttribute[] | undefined): Record<string, unknown> | null {
  if (!attrs || attrs.length === 0) return null;
  return Object.fromEntries(attrs.map((a) => [a.id, a.value_name ?? null]));
}

/**
 * Converte um anúncio cru do Mercado Livre no produto normalizado para upsert.
 * Itens sem variações geram uma variante sintética (external_id = id do item),
 * mantendo o estoque sempre por variante.
 */
export function mapMeliItem(
  item: MlRawItem,
  ctx: { companyId: string; marketplaceAccountId: string },
): NormalizedProduct {
  const variants: NormalizedVariant[] =
    item.variations && item.variations.length > 0
      ? item.variations.map((v) => ({
          externalId: String(v.id),
          sku: v.seller_sku ?? null,
          gtin: gtinOf(v.attribute_combinations),
          color: attrValue(v.attribute_combinations, 'COLOR'),
          size: attrValue(v.attribute_combinations, 'SIZE'),
          price: v.price ?? item.price ?? null,
          availableQuantity: v.available_quantity ?? 0,
          attributes: attrsToRecord(v.attribute_combinations),
        }))
      : [
          {
            externalId: item.id, // variante sintética = o próprio item
            sku: item.seller_sku ?? null,
            gtin: gtinOf(item.attributes),
            color: attrValue(item.attributes, 'COLOR'),
            size: attrValue(item.attributes, 'SIZE'),
            price: item.price ?? null,
            availableQuantity: item.available_quantity ?? 0,
            attributes: attrsToRecord(item.attributes),
          },
        ];

  const images: NormalizedImage[] = (item.pictures ?? []).map((p, index) => ({
    externalId: p.id ?? `${item.id}-${index}`,
    url: p.secure_url ?? p.url ?? '',
    position: index,
  }));

  return {
    companyId: ctx.companyId,
    marketplaceAccountId: ctx.marketplaceAccountId,
    externalId: item.id,
    sku: item.seller_sku ?? null,
    title: item.title,
    status: item.status,
    price: item.price ?? null,
    currency: item.currency_id ?? 'BRL',
    availableQuantity: item.available_quantity ?? 0,
    categoryId: item.category_id ?? null,
    permalink: item.permalink ?? null,
    thumbnail: item.thumbnail ?? null,
    listingType: item.listing_type_id ?? null,
    variants,
    images,
  };
}
