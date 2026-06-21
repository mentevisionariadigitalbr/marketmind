import { Logger } from '@nestjs/common';
import { EmailMessage, EmailSender } from './email-sender.port';

/**
 * Sender de fallback (sem provedor configurado): apenas registra no log e guarda
 * as mensagens. Mantém os fluxos funcionando em dev/test sem RESEND_API_KEY —
 * mesmo padrão do NoopJobDispatcher das filas.
 */
export class NoopEmailSender implements EmailSender {
  private readonly logger = new Logger('NoopEmailSender');
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    this.logger.warn(`[DEV] e-mail não enviado (provedor ausente): "${message.subject}" → ${message.to}`);
  }
}
