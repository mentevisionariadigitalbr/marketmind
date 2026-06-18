/** Marketplaces suportados pela plataforma (multi-marketplace foundation). */
export const MARKETPLACE_CODES = [
  'MERCADO_LIVRE',
  'SHOPEE',
  'AMAZON',
  'MAGALU',
  'CUSTOM',
] as const;

export type MarketplaceCode = (typeof MARKETPLACE_CODES)[number];

export function isMarketplaceCode(value: string): value is MarketplaceCode {
  return (MARKETPLACE_CODES as readonly string[]).includes(value);
}
