import { Inject, Injectable } from '@nestjs/common';
import {
  ADMIN_METRICS_REPOSITORY,
  AdminMetricsRepository,
} from '../domain/ports/admin-metrics.repository';
import { computeSaasMetrics, SaasMetrics } from '../domain/saas-metrics';

/** Métricas de negócio (MRR, ativos, churn, conversão) agregadas da plataforma. */
@Injectable()
export class GetSaasMetricsUseCase {
  constructor(
    @Inject(ADMIN_METRICS_REPOSITORY) private readonly repo: AdminMetricsRepository,
  ) {}

  async execute(): Promise<SaasMetrics> {
    const [subscriptions, plans] = await Promise.all([
      this.repo.loadSubscriptions(),
      this.repo.loadPlans(),
    ]);
    return computeSaasMetrics(subscriptions, plans);
  }
}
