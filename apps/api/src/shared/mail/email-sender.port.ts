/** Porta de envio de e-mail transacional (provider-agnostic). */
export const EMAIL_SENDER = Symbol('EmailSender');

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
