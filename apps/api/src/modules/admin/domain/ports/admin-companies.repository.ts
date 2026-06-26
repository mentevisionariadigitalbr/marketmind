export const ADMIN_COMPANIES_REPOSITORY = Symbol('AdminCompaniesRepository');

export interface CompanySubscriptionView {
  status: string;
  planCode: string | null;
  planName: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CompanyListItem {
  id: string;
  name: string;
  taxId: string | null;
  createdAt: string;
  usersCount: number;
  subscription: CompanySubscriptionView | null;
}

export interface CompanyListPage {
  items: CompanyListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompanyDetail {
  company: { id: string; name: string; taxId: string | null; taxRegime: string; createdAt: string };
  subscription: (CompanySubscriptionView & { provider: string | null; createdAt: string }) | null;
  users: { id: string; name: string; email: string; role: string; status: string; emailVerified: boolean }[];
  invoices: {
    id: string;
    provider: string;
    amountCents: number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    issuedAt: string;
    paidAt: string | null;
    hostedUrl: string | null;
  }[];
  marketplaceAccounts: {
    id: string;
    nickname: string | null;
    externalUserId: string;
    status: string;
    lastSyncedAt: string | null;
  }[];
}

/** Leitura CROSS-TENANT (sem contexto de tenant → RLS aberta) de empresas/clientes. */
export interface AdminCompaniesRepository {
  listCompanies(params: { page: number; pageSize: number; status?: string }): Promise<CompanyListPage>;
  getCompanyDetail(id: string): Promise<CompanyDetail | null>;
}
