import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { TokenCipher } from './token-cipher.port';

const VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_SALT = 'marketmind:token-cipher:v1';

/**
 * AES-256-GCM com chave derivada (scrypt) do segredo de ambiente. O envelope é
 * `v1:<iv>:<authTag>:<ciphertext>` (todos em base64). GCM garante confidencialidade
 * **e** integridade — adulteração faz a decifragem falhar.
 */
export class AesGcmTokenCipher implements TokenCipher {
  private readonly key: Buffer;

  constructor(secret: string) {
    if (!secret || secret.length < 16) {
      throw new Error('TOKEN_ENCRYPTION_KEY ausente ou muito curto (mín. 16 chars).');
    }
    this.key = scryptSync(secret, KEY_SALT, 32);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(
      ':',
    );
  }

  decrypt(payload: string): string {
    const [version, ivB64, tagB64, dataB64] = payload.split(':');
    if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
      throw new Error('Envelope de token inválido.');
    }
    const decipher = createDecipheriv(ALGO, this.key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return plaintext.toString('utf8');
  }
}
