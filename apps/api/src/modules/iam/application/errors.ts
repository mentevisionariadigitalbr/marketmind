// Erros base movidos para @marketmind/kernel (Sprint 2.7). Re-exportados +
// erros específicos do IAM (estendem o ApplicationError do kernel).
import { ApplicationError } from '@marketmind/kernel';

export { ApplicationError, ValidationError, NotFoundError } from '@marketmind/kernel';

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

export class InvalidInviteError extends ApplicationError {
  constructor() {
    super('INVALID_INVITE', 'Convite inválido ou expirado.');
  }
}
