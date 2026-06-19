import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardMetrics } from '../../infrastructure/metrics/dashboard-metrics';

/** Exposição Prometheus (Módulo 12). Público (scrape do Prometheus). */
@ApiTags('Observability')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: DashboardMetrics) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  expose(): Promise<string> {
    return this.metrics.expose();
  }
}
