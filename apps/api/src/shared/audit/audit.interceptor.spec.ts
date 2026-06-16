import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogEntry, AuditLogRepository } from './audit-log.repository';

class FakeAuditRepo implements AuditLogRepository {
  entries: AuditLogEntry[] = [];
  shouldThrow = false;
  async record(entry: AuditLogEntry): Promise<void> {
    if (this.shouldThrow) throw new Error('db down');
    this.entries.push(entry);
  }
}

const flush = (): Promise<void> => new Promise((r) => setImmediate(r));

function makeContext(opts: {
  method: string;
  action?: string;
  user?: { sub: string; companyId: string };
  statusCode?: number;
  path?: string;
}): { ctx: ExecutionContext; reflector: Reflector } {
  const path = opts.path ?? '/auth/login';
  const req = {
    method: opts.method,
    url: path,
    originalUrl: path,
    ip: '1.2.3.4',
    headers: { 'user-agent': 'jest-agent' },
    user: opts.user,
    route: { path },
  };
  const res = { statusCode: opts.statusCode ?? 200 };
  const ctx = {
    getType: () => 'http',
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  const reflector = { get: () => opts.action } as unknown as Reflector;
  return { ctx, reflector };
}

const handlerOf = (value: unknown): CallHandler => ({ handle: () => of(value) });
const handlerErr = (err: unknown): CallHandler => ({ handle: () => throwError(() => err) });

describe('AuditInterceptor', () => {
  let repo: FakeAuditRepo;
  beforeEach(() => {
    repo = new FakeAuditRepo();
  });

  it('registra ação com usuário e tenant a partir dos claims (rota autenticada)', async () => {
    const { ctx, reflector } = makeContext({
      method: 'POST',
      action: 'iam.role.assign',
      user: { sub: 'user-1', companyId: 'company-1' },
      statusCode: 201,
      path: '/iam/roles',
    });
    const interceptor = new AuditInterceptor(reflector, repo);

    await lastValueFrom(interceptor.intercept(ctx, handlerOf({ ok: true })));
    await flush();

    expect(repo.entries).toHaveLength(1);
    expect(repo.entries[0]).toMatchObject({
      action: 'iam.role.assign',
      userId: 'user-1',
      companyId: 'company-1',
      method: 'POST',
      path: '/iam/roles',
      statusCode: 201,
      ip: '1.2.3.4',
      userAgent: 'jest-agent',
    });
  });

  it('captura o ator pelo corpo da resposta quando não há claims (login)', async () => {
    const { ctx, reflector } = makeContext({ method: 'POST', action: 'auth.login' });
    const interceptor = new AuditInterceptor(reflector, repo);

    await lastValueFrom(
      interceptor.intercept(ctx, handlerOf({ user: { id: 'u9', companyId: 'c9' }, accessToken: 'x' })),
    );
    await flush();

    expect(repo.entries[0]).toMatchObject({ action: 'auth.login', userId: 'u9', companyId: 'c9' });
  });

  it('ignora GET sem @AuditAction (não audita leitura)', async () => {
    const { ctx, reflector } = makeContext({ method: 'GET', path: '/auth/me' });
    const interceptor = new AuditInterceptor(reflector, repo);

    await lastValueFrom(interceptor.intercept(ctx, handlerOf({ ok: true })));
    await flush();

    expect(repo.entries).toHaveLength(0);
  });

  it('audita método que altera estado mesmo sem @AuditAction (ação padrão)', async () => {
    const { ctx, reflector } = makeContext({ method: 'DELETE', path: '/things/1' });
    const interceptor = new AuditInterceptor(reflector, repo);

    await lastValueFrom(interceptor.intercept(ctx, handlerOf(null)));
    await flush();

    expect(repo.entries[0].action).toBe('DELETE /things/1');
  });

  it('registra falhas com o status do erro', async () => {
    const { ctx, reflector } = makeContext({ method: 'POST', action: 'auth.login' });
    const interceptor = new AuditInterceptor(reflector, repo);

    await expect(
      lastValueFrom(interceptor.intercept(ctx, handlerErr({ status: 401 }))),
    ).rejects.toEqual({ status: 401 });
    await flush();

    expect(repo.entries[0]).toMatchObject({ action: 'auth.login', statusCode: 401 });
  });

  it('falha de gravação não derruba a requisição', async () => {
    repo.shouldThrow = true;
    const { ctx, reflector } = makeContext({ method: 'POST', action: 'auth.login' });
    const interceptor = new AuditInterceptor(reflector, repo);

    const value = await lastValueFrom(interceptor.intercept(ctx, handlerOf({ ok: true })));
    await flush();

    expect(value).toEqual({ ok: true });
    expect(repo.entries).toHaveLength(0);
  });
});
