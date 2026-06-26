import { CallHandler, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { ImpersonationReadOnlyInterceptor } from './impersonation-read-only.interceptor';

function ctx(method: string, user?: { readOnly?: boolean }): ExecutionContext {
  const req = { method, user };
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const next: CallHandler = { handle: () => of('ok') };

describe('ImpersonationReadOnlyInterceptor', () => {
  const interceptor = new ImpersonationReadOnlyInterceptor();

  it('bloqueia escrita (POST) em sessão readOnly', () => {
    expect(() => interceptor.intercept(ctx('POST', { readOnly: true }), next)).toThrow(ForbiddenException);
  });

  it.each(['PUT', 'PATCH', 'DELETE'])('bloqueia %s em sessão readOnly', (m) => {
    expect(() => interceptor.intercept(ctx(m, { readOnly: true }), next)).toThrow(ForbiddenException);
  });

  it('permite leitura (GET) em sessão readOnly', () => {
    expect(() => interceptor.intercept(ctx('GET', { readOnly: true }), next)).not.toThrow();
  });

  it('não afeta sessões normais (sem readOnly)', () => {
    expect(() => interceptor.intercept(ctx('POST', { readOnly: false }), next)).not.toThrow();
    expect(() => interceptor.intercept(ctx('POST', undefined), next)).not.toThrow();
  });
});
