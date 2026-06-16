export const PASSWORD_HASHER = Symbol('PasswordHasher');

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}
