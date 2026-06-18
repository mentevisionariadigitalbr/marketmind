import { MarketplaceCode } from './marketplace-code';

/** Referência tipada a uma conta de marketplace (value object). */
export class MarketplaceAccountRef {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly marketplaceCode: MarketplaceCode,
    public readonly externalUserId: string,
  ) {}

  equals(other?: MarketplaceAccountRef): boolean {
    return (
      other instanceof MarketplaceAccountRef &&
      other.id === this.id &&
      other.marketplaceCode === this.marketplaceCode
    );
  }
}
