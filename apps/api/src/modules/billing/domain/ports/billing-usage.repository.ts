export const BILLING_USAGE_REPOSITORY = Symbol('BillingUsageRepository');

export interface UsageCounts {
  marketplaceAccounts: number;
  products: number;
}

export interface BillingUsageRepository {
  /** Contagens de uso do tenant corrente (RLS) para refletir limites na UI. */
  countForCurrentCompany(): Promise<UsageCounts>;
  /** createdAt da empresa corrente — âncora do início do trial. */
  companyCreatedAt(): Promise<Date | null>;
}
