import { MetricsRegistry, METRIC } from './metrics';

describe('MetricsRegistry', () => {
  it('conta e rotula counters', () => {
    const m = new MetricsRegistry();
    m.inc(METRIC.PROCESSED, { queue: 'ml.order.fetch' });
    m.inc(METRIC.PROCESSED, { queue: 'ml.order.fetch' });
    m.inc(METRIC.PROCESSED, { queue: 'ml.catalog.sync' });
    m.inc(METRIC.DLQ, { queue: 'ml.order.fetch' });

    expect(m.counter(METRIC.PROCESSED, { queue: 'ml.order.fetch' })).toBe(2);
    expect(m.counter(METRIC.PROCESSED, { queue: 'ml.catalog.sync' })).toBe(1);
    expect(m.counter(METRIC.DLQ, { queue: 'ml.order.fetch' })).toBe(1);
  });

  it('observa histogramas (count/sum/min/max)', () => {
    const m = new MetricsRegistry();
    m.observe(METRIC.PROCESSING_TIME, 100, { queue: 'q' });
    m.observe(METRIC.PROCESSING_TIME, 300, { queue: 'q' });

    const h = m.histogram(METRIC.PROCESSING_TIME, { queue: 'q' })!;
    expect(h).toMatchObject({ count: 2, sum: 400, min: 100, max: 300 });
  });

  it('exporta no formato Prometheus', () => {
    const m = new MetricsRegistry();
    m.inc(METRIC.FAILED, { queue: 'q' });
    m.observe(METRIC.PROCESSING_TIME, 50, { queue: 'q' });
    const text = m.prometheus();
    expect(text).toContain('jobs_failed_total{queue="q"} 1');
    expect(text).toContain('jobs_processing_time_ms_count{queue="q"} 1');
    expect(text).toContain('jobs_processing_time_ms_sum{queue="q"} 50');
  });
});
