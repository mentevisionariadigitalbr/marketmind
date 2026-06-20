import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { IamModule } from '../iam/iam.module';
import { DASHBOARD_QUERY_PORT, DASHBOARD_CACHE } from './dashboard.tokens';
import { DashboardService } from './application/dashboard.service';
import { PrismaDashboardQueryRepository } from './infrastructure/prisma-dashboard-query.repository';
import { DashboardMetrics } from './infrastructure/metrics/dashboard-metrics';
import { MetricsGuard } from './infrastructure/metrics/metrics.guard';
import { InMemoryDashboardCache } from './infrastructure/cache/in-memory-cache';
import { RedisDashboardCache } from './infrastructure/cache/redis-cache';
import type { DashboardCache } from './infrastructure/cache/dashboard-cache.port';
import { DashboardController } from './presentation/http/dashboard.controller';
import { MetricsController } from './presentation/http/metrics.controller';

/**
 * Dashboard Executivo (Sprint 3.1). Ports → adapters:
 *  - DASHBOARD_QUERY_PORT → Prisma (queries reais, RLS).
 *  - DASHBOARD_CACHE → Redis (se REDIS_URL) ou in-memory (fallback).
 */
@Module({
  imports: [IamModule],
  controllers: [DashboardController, MetricsController],
  providers: [
    DashboardService,
    DashboardMetrics,
    MetricsGuard,
    { provide: DASHBOARD_QUERY_PORT, useClass: PrismaDashboardQueryRepository },
    {
      provide: DASHBOARD_CACHE,
      useFactory: (config: ConfigService): DashboardCache => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return new InMemoryDashboardCache();
        const redis = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
        redis.on('error', () => undefined); // resiliente: erros de conexão não derrubam a API
        void redis.connect().catch(() => undefined);
        return new RedisDashboardCache(redis);
      },
      inject: [ConfigService],
    },
  ],
})
export class DashboardModule {}
