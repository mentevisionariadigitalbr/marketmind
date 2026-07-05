import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Métricas Prometheus do dashboard (Módulo 12). Registry próprio (isolado do
 * default global) — testável e sem colisão de registro. Exposto em GET /metrics.
 */
@Injectable()
export class DashboardMetrics {
  readonly registry = new Registry();

  readonly requestsTotal = new Counter({
    name: 'dashboard_requests_total',
    help: 'Total de requisições ao dashboard',
    labelNames: ['endpoint', 'status'] as const,
    registers: [this.registry],
  });

  readonly queryDuration = new Histogram({
    name: 'dashboard_query_duration_ms',
    help: 'Duração das queries analíticas (ms)',
    labelNames: ['endpoint'] as const,
    buckets: [10, 50, 100, 200, 300, 500, 1000, 2000],
    registers: [this.registry],
  });

  readonly renderDuration = new Histogram({
    name: 'dashboard_render_duration',
    help: 'Duração total do handler do dashboard (ms)',
    labelNames: ['endpoint'] as const,
    buckets: [10, 50, 100, 200, 300, 500, 1000, 2000],
    registers: [this.registry],
  });

  readonly cacheHits = new Counter({
    name: 'dashboard_cache_hits',
    help: 'Cache hits do dashboard',
    labelNames: ['endpoint'] as const,
    registers: [this.registry],
  });

  readonly cacheMisses = new Counter({
    name: 'dashboard_cache_misses',
    help: 'Cache misses do dashboard',
    labelNames: ['endpoint'] as const,
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: 'marketmind_api_' });
  }

  recordCache(endpoint: string, hit: boolean): void {
    (hit ? this.cacheHits : this.cacheMisses).inc({ endpoint });
  }

  async expose(): Promise<string> {
    return this.registry.metrics();
  }
}
