import { IncomingJob, JobLifecycle, MetricsRegistry, METRIC, StructuredLogger } from '@marketmind/queue';
import { JobStore } from '../jobs/job-store';

function companyOf(job: IncomingJob): string | null {
  const data = job.data as { companyId?: string } | undefined;
  return data?.companyId ?? null;
}

/**
 * Constrói os hooks de ciclo de vida que (1) espelham o estado em `jobs` e
 * (2) atualizam as métricas. Reaproveitado por toda fila.
 */
export function makeJobLifecycle(deps: {
  queue: string;
  store: JobStore;
  metrics: MetricsRegistry;
  logger: StructuredLogger;
}): JobLifecycle {
  const { queue, store, metrics } = deps;
  const labels = { queue };

  const persist = async (record: Parameters<JobStore['save']>[0]) => {
    try {
      await store.save(record);
    } catch (err) {
      deps.logger.warn('falha ao espelhar job', { queue, error: (err as Error).message });
    }
  };

  return {
    onActive: (job) =>
      persist({
        queue,
        jobId: job.id,
        jobName: job.name,
        status: 'processing',
        companyId: companyOf(job),
        attempts: job.attemptsMade,
        startedAt: new Date(),
      }),

    onCompleted: (job, durationMs) => {
      metrics.inc(METRIC.PROCESSED, labels);
      metrics.observe(METRIC.PROCESSING_TIME, durationMs, labels);
      return persist({
        queue,
        jobId: job.id,
        jobName: job.name,
        status: 'completed',
        companyId: companyOf(job),
        attempts: job.attemptsMade,
        finishedAt: new Date(),
        durationMs,
      });
    },

    onFailed: (job, error, willRetry) => {
      metrics.inc(METRIC.FAILED, labels);
      if (willRetry) metrics.inc(METRIC.RETRIED, labels);
      return persist({
        queue,
        jobId: job.id,
        jobName: job.name,
        status: 'failed',
        companyId: companyOf(job),
        attempts: job.attemptsMade,
        error: error.message,
      });
    },

    onDeadLetter: (job, error) => {
      metrics.inc(METRIC.DLQ, labels);
      return persist({
        queue,
        jobId: job.id,
        jobName: job.name,
        status: 'dead_letter',
        companyId: companyOf(job),
        attempts: job.attemptsMade,
        finishedAt: new Date(),
        error: error.message,
      });
    },
  };
}
