import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TOKEN_CIPHER, AesGcmTokenCipher } from '@marketmind/integration-core';

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
