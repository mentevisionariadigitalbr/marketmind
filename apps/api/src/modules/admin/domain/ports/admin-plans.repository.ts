export const ADMIN_PLANS_REPOSITORY = Symbol('AdminPlansRepository');

export interface AdminPlanView {
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
  createdAt: string;
}

export interface CreatePlanData {
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
}

export type UpdatePlanData = Partial<Omit<CreatePlanData, 'code'>> & { active?: boolean };

export interface AdminPlansRepository {
  listAll(): Promise<AdminPlanView[]>;
  findById(id: string): Promise<AdminPlanView | null>;
  /** Cria um plano. Lança PlanCodeInUseError se o código já existir. */
  create(data: CreatePlanData): Promise<AdminPlanView>;
  /** Atualiza um plano. Null se não existir. */
  update(id: string, data: UpdatePlanData): Promise<AdminPlanView | null>;
}
