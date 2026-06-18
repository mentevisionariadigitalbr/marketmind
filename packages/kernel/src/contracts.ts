/**
 * Contratos de infraestrutura compartilhados (abstrações injetáveis). Permitem
 * trocar implementações (incl. preparar OpenTelemetry) sem tocar no domínio.
 */

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export interface Clock {
  now(): Date;
  /** epoch ms — útil para TTL/backoff testáveis. */
  millis(): number;
}

export interface IdGenerator {
  uuid(): string;
}

/** Abstração mínima de tracing (preparação para OpenTelemetry). */
export interface Span {
  setAttribute(key: string, value: string | number | boolean): void;
  end(): void;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span;
  /** Executa `fn` dentro de um span; encerra automaticamente. */
  withSpan<T>(name: string, fn: (span: Span) => Promise<T>): Promise<T>;
}

/** Tokens DI (NestJS) para as abstrações acima. */
export const LOGGER = Symbol('Logger');
export const CLOCK = Symbol('Clock');
export const ID_GENERATOR = Symbol('IdGenerator');
export const TRACER = Symbol('Tracer');
