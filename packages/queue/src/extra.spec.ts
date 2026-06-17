import { QUEUES, ALL_QUEUES, dlqName } from './ports';
import { StructuredLogger } from './logger';
import { MetricsRegistry, METRIC } from './metrics';
import { CircuitBreaker } from './circuit-breaker';

describe('queue utilities', () => {
  it('dlqName e ALL_QUEUES', () => {
    expect(dlqName(QUEUES.ORDER_FETCH)).toBe('ml.order.fetch.dlq');
    expect(ALL_QUEUES).toContain('ml.webhook.process');
    expect(ALL_QUEUES).toHaveLength(4);
  });

  it('logger cobre todos os níveis', () => {
    const lines: string[] = [];
    const log = new StructuredLogger({}, (l) => lines.push(l), () => 'T');
    log.debug('d');
    log.warn('w');
    log.error('e', { code: 1 });
    expect(lines.map((l) => JSON.parse(l).level)).toEqual(['debug', 'warn', 'error']);
  });

  it('metrics snapshot agrega counters e histogramas', () => {
    const m = new MetricsRegistry();
    m.inc(METRIC.RETRIED, { queue: 'q' });
    m.observe(METRIC.PROCESSING_TIME, 10);
    const snap = m.snapshot();
    expect(snap.counters['jobs_retried_total{queue="q"}']).toBe(1);
    expect(snap.histograms['jobs_processing_time_ms'].count).toBe(1);
  });

  it('circuit breaker começa CLOSED', () => {
    expect(new CircuitBreaker().getState()).toBe('CLOSED');
  });
});
