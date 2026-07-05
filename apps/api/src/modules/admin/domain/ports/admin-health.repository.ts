export const ADMIN_HEALTH_REPOSITORY = Symbol('AdminHealthRepository');

export interface ProblematicAccount {
  id: string;
  companyId: string;
  companyName: string;
  marketplace: string;
  nickname: string | null;
  status: string;
  lastSyncedAt: string | null;
}

export interface FailedJob {
  id: string;
  queue: string;
  jobName: string;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
}

export interface HealthSummary {
  marketplaceAccounts: {
    total: number;
    byStatus: Record<string, number>;
    problematic: ProblematicAccount[];
  };
  jobs: {
    byStatus: Record<string, number>;
    recentFailures: FailedJob[];
  };
}

/** Saúde operacional da plataforma (cross-tenant). */
export interface AdminHealthRepository {
  getHealth(): Promise<HealthSummary>;
}
