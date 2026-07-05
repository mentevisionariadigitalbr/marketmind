import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { RunDueDigestsUseCase } from '../application/report.use-cases';

/**
 * Agendador in-process dos relatórios por e-mail (Fase 3, Inc.3). Opt-in via
 * REPORTS_DIGEST_ENABLED=true (desligado por padrão — testes/dev não enviam).
 * Em produção multi-instância, migrar para um job repeatable no worker (BullMQ).
 */
@Injectable()
export class ReportDigestScheduler implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ReportDigestScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly runDue: RunDueDigestsUseCase) {}

  onApplicationBootstrap(): void {
    if ((process.env.REPORTS_DIGEST_ENABLED ?? 'false') !== 'true') return;
    const intervalMs = Number(process.env.REPORTS_DIGEST_INTERVAL_MS ?? 3_600_000);
    this.timer = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(`Agendador de relatórios ativo (intervalo ${intervalMs}ms)`);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const { sent } = await this.runDue.execute();
      if (sent > 0) this.logger.log(`Digests enviados: ${sent}`);
    } catch (err) {
      this.logger.error('Falha ao enviar digests', err as Error);
    } finally {
      this.running = false;
    }
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
