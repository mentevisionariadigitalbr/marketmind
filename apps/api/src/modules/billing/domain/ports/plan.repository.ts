export const PLAN_REPOSITORY = Symbol('PlanRepository');

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  currency: string;
  interval: string;
  trialDays: number;
  maxMarketplaceAccounts: number | null;
  maxProducts: number | null;
  historyWindowDays: number | null;
  stripePriceId: string | null;
  active: boolean;
}

export interface PlanRepository {
  /** Planos ativos (catálogo público). */
  listActive(): Promise<PlanRecord[]>;
  findByCode(code: string): Promise<PlanRecord | null>;
  findById(id: string): Promise<PlanRecord | null>;
}
