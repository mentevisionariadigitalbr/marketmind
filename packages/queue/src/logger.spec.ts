import { StructuredLogger, redact } from './logger';

describe('redact', () => {
  it('mascara chaves sensíveis (tokens, secrets, senhas)', () => {
    const out = redact({
      accessToken: 'AT-secret',
      refresh_token: 'RT-secret',
      clientSecret: 'cs',
      password: 'p',
      nested: { authorization: 'Bearer xyz', ok: 'visible' },
    }) as Record<string, unknown>;

    expect(out.accessToken).toBe('[REDACTED]');
    expect(out.refresh_token).toBe('[REDACTED]');
    expect(out.clientSecret).toBe('[REDACTED]');
    expect(out.password).toBe('[REDACTED]');
    expect((out.nested as Record<string, unknown>).authorization).toBe('[REDACTED]');
    expect((out.nested as Record<string, unknown>).ok).toBe('visible');
  });

  it('mascara Bearer tokens dentro de strings', () => {
    expect(redact('Authorization: Bearer abc.def.ghi')).toBe('Authorization: Bearer [REDACTED]');
  });

  it('preserva valores não sensíveis', () => {
    expect(redact({ companyId: 'c1', count: 3 })).toEqual({ companyId: 'c1', count: 3 });
  });
});

describe('StructuredLogger', () => {
  it('emite JSON estruturado com base + campos e nunca vaza segredos', () => {
    const lines: string[] = [];
    const logger = new StructuredLogger({ service: 'workers' }, (l) => lines.push(l), () => 'T');
    logger.child({ queue: 'ml.order.fetch' }).info('processed', {
      accountId: 'a1',
      accessToken: 'AT-leak',
    });

    const record = JSON.parse(lines[0]);
    expect(record).toMatchObject({
      timestamp: 'T',
      level: 'info',
      message: 'processed',
      service: 'workers',
      queue: 'ml.order.fetch',
      accountId: 'a1',
      accessToken: '[REDACTED]',
    });
  });
});
