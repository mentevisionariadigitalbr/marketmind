/**
 * Erros de aplicação independentes de framework. A camada de apresentação
 * (DomainExceptionFilter) os mapeia para status HTTP.
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

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super('VALIDATION', message);
  }
}

export class EmailAlreadyInUseError extends ApplicationError {
  constructor() {
    super('EMAIL_IN_USE', 'Este e-mail já está cadastrado.');
  }
}

export class InvalidCredentialsError extends ApplicationError {
  constructor() {
    super('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }
}

export class InvalidRefreshTokenError extends ApplicationError {
  constructor() {
    super('INVALID_REFRESH_TOKEN', 'Sessão inválida ou expirada. Faça login novamente.');
  }
}

export class UserInactiveError extends ApplicationError {
  constructor() {
    super('USER_INACTIVE', 'Usuário inativo.');
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string) {
    super('NOT_FOUND', `${entity} não encontrado(a).`);
  }
}
