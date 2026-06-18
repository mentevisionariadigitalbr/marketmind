import {
  ApplicationError,
  DomainError,
  ValidationError,
  NotFoundError,
  ok,
  err,
  left,
  right,
  AggregateRoot,
  BaseEntity,
  SystemClock,
  UuidGenerator,
  NoopTracer,
  runWithTenant,
  getTenant,
  requireTenant,
} from './index';
import type { DomainEvent } from './index';

describe('kernel: errors', () => {
  it('ApplicationError carrega code e name da subclasse', () => {
    const e = new ValidationError('x');
    expect(e).toBeInstanceOf(ApplicationError);
    expect(e.code).toBe('VALIDATION');
    expect(e.name).toBe('ValidationError');
    expect(new NotFoundError('Pedido').code).toBe('NOT_FOUND');
    expect(new DomainError('regra').code).toBe('DOMAIN');
  });
});

describe('kernel: Result/Either', () => {
  it('Ok/Err e map', () => {
    expect(ok(2).map((n) => n + 1).unwrap()).toBe(3);
    const e = err<number>(new Error('boom'));
    expect(e.isErr()).toBe(true);
    expect(() => e.unwrap()).toThrow('boom');
  });
  it('Either left/right', () => {
    expect(right<number>(5).isOk()).toBe(true);
    expect(left<string>('fail').isErr()).toBe(true);
  });
});

describe('kernel: entities', () => {
  class Order extends AggregateRoot<string> {
    constructor(id: string) {
      super(id);
    }
    emit(e: DomainEvent) {
      this.addEvent(e);
    }
  }
  it('igualdade por id + eventos de domínio (outbox)', () => {
    const a = new Order('1');
    expect(a.equals(new Order('1') as BaseEntity)).toBe(true);
    a.emit({ name: 'OrderCreated', occurredAt: new Date() });
    expect(a.pullEvents()).toHaveLength(1);
    expect(a.pullEvents()).toHaveLength(0); // drenado
  });
});

describe('kernel: system contracts', () => {
  it('clock, id generator e noop tracer', async () => {
    expect(new SystemClock().now()).toBeInstanceOf(Date);
    expect(new UuidGenerator().uuid()).toMatch(/[0-9a-f-]{36}/);
    const out = await new NoopTracer().withSpan('op', async (span) => {
      span.setAttribute('k', 'v');
      return 42;
    });
    expect(out).toBe(42);
  });
});

describe('kernel: tenant context', () => {
  it('propaga e exige contexto', () => {
    expect(getTenant()).toBeUndefined();
    const value = runWithTenant(
      { companyId: 'c1', userId: 'u1', role: 'OWNER', correlationId: 'corr-1' },
      () => requireTenant(),
    );
    expect(value).toMatchObject({ companyId: 'c1', correlationId: 'corr-1' });
    expect(() => requireTenant()).toThrow();
  });
});
