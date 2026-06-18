import { randomUUID } from 'node:crypto';
import { Clock, IdGenerator, Span, Tracer } from './contracts';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  millis(): number {
    return Date.now();
  }
}

export class UuidGenerator implements IdGenerator {
  uuid(): string {
    return randomUUID();
  }
}

/** Tracer no-op (placeholder até plugar OpenTelemetry, sem implementação parcial). */
export class NoopTracer implements Tracer {
  startSpan(): Span {
    return { setAttribute: () => undefined, end: () => undefined };
  }
  async withSpan<T>(_name: string, fn: (span: Span) => Promise<T>): Promise<T> {
    return fn(this.startSpan());
  }
}
