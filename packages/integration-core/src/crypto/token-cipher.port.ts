export const TOKEN_CIPHER = Symbol('TokenCipher');

/** Criptografia simétrica para segredos em repouso (tokens OAuth de marketplace). */
export interface TokenCipher {
  /** Cifra um texto puro, devolvendo um envelope versionado e autenticado. */
  encrypt(plaintext: string): string;
  /** Decifra o envelope; lança se adulterado ou chave incorreta. */
  decrypt(payload: string): string;
}
