import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOKEN_CIPHER } from './token-cipher.port';
import { AesGcmTokenCipher } from './aes-gcm-token-cipher';

@Global()
@Module({
  providers: [
    {
      provide: TOKEN_CIPHER,
      useFactory: (config: ConfigService) =>
        new AesGcmTokenCipher(config.get<string>('TOKEN_ENCRYPTION_KEY') ?? ''),
      inject: [ConfigService],
    },
  ],
  exports: [TOKEN_CIPHER],
})
export class CryptoModule {}
