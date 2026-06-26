import { ApplicationError } from '@marketmind/kernel';

/** Código de plano já em uso (unique). Mapeado para HTTP 409. */
export class PlanCodeInUseError extends ApplicationError {
  constructor(code: string) {
    super('PLAN_CODE_IN_USE', `Já existe um plano com o código "${code}".`);
  }
}
