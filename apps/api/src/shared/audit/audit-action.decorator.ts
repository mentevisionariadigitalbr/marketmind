import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

/**
 * Rotula a ação registrada na trilha de auditoria para um handler. Sem o
 * decorator, métodos que alteram estado (POST/PUT/PATCH/DELETE) são auditados
 * com a ação padrão `"<MÉTODO> <rota>"`.
 *
 *   @AuditAction('auth.login')
 *   @Post('login') ...
 */
export const AuditAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
