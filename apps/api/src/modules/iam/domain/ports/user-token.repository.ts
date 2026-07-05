/** Porta de tokens de uso único (reset de senha, verificação de e-mail). */
export const USER_TOKEN_REPOSITORY = Symbol('UserTokenRepository');

export type UserTokenType = 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';

export interface IssueTokenData {
  userId: string;
  companyId: string;
  type: UserTokenType;
  tokenHash: string;
  expiresAt: Date;
}

export interface UserTokenRepository {
  /** Cria um token, invalidando os anteriores do mesmo tipo do usuário. */
  issue(data: IssueTokenData): Promise<void>;
  /** Consome (uso único, atômico) um token válido; devolve o userId ou null. */
  consume(tokenHash: string, type: UserTokenType): Promise<{ userId: string } | null>;
}
