/**
 * Logger estruturado (JSON) com redaction automática de segredos. NUNCA registra
 * access_token / refresh_token / client_secret / authorization / senhas.
 */

const SECRET_KEY = /(access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization|password|secret|token|apikey|api[_-]?key)/i;
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._-]+/gi;
const REDACTED = '[REDACTED]';

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return value;
  if (typeof value === 'string') {
    return value.replace(BEARER, `$1${REDACTED}`);
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY.test(k) ? REDACTED : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, unknown>;
export type LogSink = (line: string) => void;

const defaultSink: LogSink = (line) => process.stdout.write(`${line}\n`);

export class StructuredLogger {
  constructor(
    private readonly base: LogFields = {},
    private readonly sink: LogSink = defaultSink,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  child(fields: LogFields): StructuredLogger {
    return new StructuredLogger({ ...this.base, ...fields }, this.sink, this.now);
  }

  debug(message: string, fields?: LogFields): void {
    this.write('debug', message, fields);
  }
  info(message: string, fields?: LogFields): void {
    this.write('info', message, fields);
  }
  warn(message: string, fields?: LogFields): void {
    this.write('warn', message, fields);
  }
  error(message: string, fields?: LogFields): void {
    this.write('error', message, fields);
  }

  private write(level: LogLevel, message: string, fields?: LogFields): void {
    const record = redact({
      timestamp: this.now(),
      level,
      message,
      ...this.base,
      ...fields,
    });
    this.sink(JSON.stringify(record));
  }
}
