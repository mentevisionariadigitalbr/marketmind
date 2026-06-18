/**
 * Erros fundamentais, independentes de framework. A camada de apresentação
 * (ex.: DomainExceptionFilter no NestJS) mapeia `code` -> status HTTP.
 */
export class ApplicationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Violação de regra/invariante de domínio. */
export class DomainError extends ApplicationError {
  constructor(message: string, code = 'DOMAIN') {
    super(code, message);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION', message);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string) {
    super('NOT_FOUND', `${entity} não encontrado(a).`);
  }
}

export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Não autorizado.') {
    super('UNAUTHORIZED', message);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super('CONFLICT', message);
  }
}
