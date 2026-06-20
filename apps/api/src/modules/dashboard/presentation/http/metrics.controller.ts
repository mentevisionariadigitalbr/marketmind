import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DashboardMetrics } from '../../infrastructure/metrics/dashboard-metrics';
import { MetricsGuard } from '../../infrastructure/metrics/metrics.guard';

/** Exposição Prometheus (Módulo 12). Restrito a loopback/rede interna ou token
 *  de monitoramento (Sprint 3.2). Fora do rate-limit (scrape periódico). */
@ApiExcludeController()
@SkipThrottle()
@UseGuards(MetricsGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: DashboardMetrics) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  expose(): Promise<string> {
    return this.metrics.expose();
  }
}
