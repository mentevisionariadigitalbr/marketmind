import { AesGcmTokenCipher } from './aes-gcm-token-cipher';

describe('AesGcmTokenCipher', () => {
  const cipher = new AesGcmTokenCipher('dev-token-encryption-key-please-change');

  it('faz round-trip (encrypt -> decrypt)', () => {
    const secret = 'APP_USR-123-refresh-token-xyz';
    const enc = cipher.encrypt(secret);
    expect(enc).not.toContain(secret);
    expect(enc.startsWith('v1:')).toBe(true);
    expect(cipher.decrypt(enc)).toBe(secret);
  });

  it('gera ciphertexts diferentes para o mesmo texto (IV aleatório)', () => {
    const a = cipher.encrypt('same');
    const b = cipher.encrypt('same');
    expect(a).not.toBe(b);
    expect(cipher.decrypt(a)).toBe('same');
    expect(cipher.decrypt(b)).toBe('same');
  });

  it('falha ao decifrar envelope adulterado (autenticação GCM)', () => {
    const enc = cipher.encrypt('tamper-me');
    const parts = enc.split(':');
    const badData = Buffer.from('garbage').toString('base64');
    const tampered = [parts[0], parts[1], parts[2], badData].join(':');
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('rejeita envelope mal formado', () => {
    expect(() => cipher.decrypt('not-a-valid-envelope')).toThrow();
  });

  it('exige chave de tamanho mínimo', () => {
    expect(() => new AesGcmTokenCipher('short')).toThrow();
  });

  it('chave diferente não consegue decifrar', () => {
    const other = new AesGcmTokenCipher('another-different-encryption-key-here');
    const enc = cipher.encrypt('secret');
    expect(() => other.decrypt(enc)).toThrow();
  });
});
