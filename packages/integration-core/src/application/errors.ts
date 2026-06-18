import { ApplicationError } from '@marketmind/kernel';

export class IntegrationNotFoundError extends ApplicationError {
  constructor(entity: string) {
    super('NOT_FOUND', `${entity} não encontrado(a).`);
  }
}

export class IntegrationNotConfiguredError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION', message);
  }
}
