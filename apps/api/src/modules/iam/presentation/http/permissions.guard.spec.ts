import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import type { AccessClaims } from '../../domain/ports/token-service.port';

function makeGuard(required: string[] | undefined): PermissionsGuard {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  return new PermissionsGuard(reflector);
}

function contextWith(user?: Partial<AccessClaims>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('permite quando a rota não exige permissões', () => {
    expect(makeGuard(undefined).canActivate(contextWith())).toBe(true);
    expect(makeGuard([]).canActivate(contextWith())).toBe(true);
  });

  it('permite quando o usuário tem todas as permissões exigidas', () => {
    const ctx = contextWith({ permissions: ['iam:read', 'finance:read'] });
    expect(makeGuard(['iam:read']).canActivate(ctx)).toBe(true);
  });

  it('bloqueia (403) quando falta alguma permissão', () => {
    const ctx = contextWith({ permissions: ['finance:read'] });
    expect(() => makeGuard(['iam:read']).canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('bloqueia (403) quando não há usuário autenticado', () => {
    expect(() => makeGuard(['iam:read']).canActivate(contextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
