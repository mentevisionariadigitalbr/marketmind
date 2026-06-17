export const METRIC = {
  PROCESSED: 'jobs_processed_total',
  FAILED: 'jobs_failed_total',
  RETRIED: 'jobs_retried_total',
  DLQ: 'jobs_dlq_total',
  PROCESSING_TIME: 'jobs_processing_time_ms',
} as const;

type Labels = Record<string, string>;

function key(name: string, labels?: Labels): string {
  if (!labels || Object.keys(labels).length === 0) return name;
  const parts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  return `${name}{${parts}}`;
}

interface Histogram {
  count: number;
  sum: number;
  min: number;
  max: number;
}

/** Registro de métricas em processo (counters + histogramas) com exposição Prometheus. */
export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly histograms = new Map<string, Histogram>();

  inc(name: string, labels?: Labels, by = 1): void {
    const k = key(name, labels);
    this.counters.set(k, (this.counters.get(k) ?? 0) + by);
  }

  observe(name: string, value: number, labels?: Labels): void {
    const k = key(name, labels);
    const h = this.histograms.get(k) ?? { count: 0, sum: 0, min: Infinity, max: -Infinity };
    h.count += 1;
    h.sum += value;
    h.min = Math.min(h.min, value);
    h.max = Math.max(h.max, value);
    this.histograms.set(k, h);
  }

  counter(name: string, labels?: Labels): number {
    return this.counters.get(key(name, labels)) ?? 0;
  }

  histogram(name: string, labels?: Labels): Histogram | undefined {
    return this.histograms.get(key(name, labels));
  }

  snapshot(): { counters: Record<string, number>; histograms: Record<string, Histogram> } {
    return {
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(this.histograms),
    };
  }

  /** Exposição no formato texto do Prometheus. */
  prometheus(): string {
    const lines: string[] = [];
    for (const [k, v] of this.counters) lines.push(`${k} ${v}`);
    for (const [k, h] of this.histograms) {
      lines.push(`${withSuffix(k, '_count')} ${h.count}`);
      lines.push(`${withSuffix(k, '_sum')} ${h.sum}`);
    }
    return lines.join('\n');
  }
}

function withSuffix(k: string, suffix: string): string {
  const brace = k.indexOf('{');
  return brace === -1 ? `${k}${suffix}` : `${k.slice(0, brace)}${suffix}${k.slice(brace)}`;
}
