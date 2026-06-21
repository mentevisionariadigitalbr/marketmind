import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailMessage, EmailSender } from './email-sender.port';

/** Adapter de e-mail via Resend. Erros de envio não derrubam o fluxo (logados). */
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger('ResendEmailSender');
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text ?? '',
    });
    if (error) {
      this.logger.error(`Falha ao enviar e-mail "${message.subject}" → ${message.to}: ${error.message}`);
      throw new Error(`Falha no envio de e-mail: ${error.message}`);
    }
  }
}
