import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_SENDER, EmailSender } from './email-sender.port';
import { ResendEmailSender } from './resend-email-sender';
import { NoopEmailSender } from './noop-email-sender';

/**
 * Infra de e-mail transacional. Com RESEND_API_KEY usa o Resend; sem ela, cai no
 * NoopEmailSender (dev/test) — os fluxos funcionam, apenas não enviam.
 */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SENDER,
      useFactory: (config: ConfigService): EmailSender => {
        const apiKey = config.get<string>('RESEND_API_KEY');
        const from = config.get<string>('EMAIL_FROM') ?? 'MarketMind AI <no-reply@marketmind.local>';
        if (!apiKey) {
          new Logger('MailModule').warn('RESEND_API_KEY ausente — e-mails não serão enviados (NoopEmailSender).');
          return new NoopEmailSender();
        }
        return new ResendEmailSender(apiKey, from);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_SENDER],
})
export class MailModule {}
