import { Inject, Injectable } from '@nestjs/common';
import { runWithTenant, type TenantContext } from '@marketmind/kernel';
import { EMAIL_SENDER, EmailSender } from '../../../shared/mail/email-sender.port';
import {
  REPORT_SUBSCRIPTION_REPOSITORY,
  ReportSubscription,
  ReportSubscriptionRepository,
} from '../domain/ports/report-subscription.repository';
import { DIGEST_DATA_REPOSITORY, DigestDataRepository } from '../domain/ports/digest-data.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';
import { composeDigest, isDigestDue, type ReportFrequency } from './digest';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseRecipients(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s));
}

@Injectable()
export class DigestSender {
  constructor(
    @Inject(DIGEST_DATA_REPOSITORY) private readonly digestData: DigestDataRepository,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
  ) {}

  /** Constrói e envia o digest (contexto de tenant já ativo). */
  async send(recipients: string[], frequency: ReportFrequency): Promise<void> {
    if (recipients.length === 0) return;
    const data = await this.digestData.forCompany();
    const msg = composeDigest(frequency, data);
    for (const to of recipients) {
      await this.email.send({ to, subject: msg.subject, html: msg.html, text: msg.text });
    }
  }
}

@Injectable()
export class GetSubscriptionUseCase {
  constructor(@Inject(REPORT_SUBSCRIPTION_REPOSITORY) private readonly repo: ReportSubscriptionRepository) {}
  execute(): Promise<ReportSubscription | null> {
    return this.repo.getByCompany();
  }
}

export interface UpsertSubscriptionInput {
  frequency?: string;
  recipients?: string;
  enabled?: boolean;
}

@Injectable()
export class UpsertSubscriptionUseCase {
  constructor(@Inject(REPORT_SUBSCRIPTION_REPOSITORY) private readonly repo: ReportSubscriptionRepository) {}

  async execute(input: UpsertSubscriptionInput): Promise<void> {
    const frequency = input.frequency === 'DAILY' ? 'DAILY' : 'WEEKLY';
    const recipients = parseRecipients(input.recipients ?? '');
    const enabled = input.enabled ?? false;
    if (enabled && recipients.length === 0) {
      throw new ValidationError('Informe ao menos um e-mail válido para ativar o relatório.');
    }
    await this.repo.upsert({ frequency, recipients: recipients.join(', '), enabled });
  }
}

@Injectable()
export class SendDigestNowUseCase {
  constructor(
    @Inject(REPORT_SUBSCRIPTION_REPOSITORY) private readonly repo: ReportSubscriptionRepository,
    private readonly sender: DigestSender,
  ) {}

  async execute(): Promise<{ sentTo: number }> {
    const sub = await this.repo.getByCompany();
    if (!sub) throw new NotFoundError('Assinatura de relatório');
    const recipients = parseRecipients(sub.recipients);
    if (recipients.length === 0) throw new ValidationError('Cadastre um e-mail antes de enviar.');
    await this.sender.send(recipients, sub.frequency);
    return { sentTo: recipients.length };
  }
}

@Injectable()
export class RunDueDigestsUseCase {
  constructor(
    @Inject(REPORT_SUBSCRIPTION_REPOSITORY) private readonly repo: ReportSubscriptionRepository,
    private readonly sender: DigestSender,
  ) {}

  /** Cross-tenant: encontra assinaturas devidas e envia cada uma no seu contexto. */
  async execute(now = new Date()): Promise<{ sent: number }> {
    const subs = await this.repo.listEnabled();
    let sent = 0;
    for (const s of subs) {
      if (!isDigestDue(s.frequency, s.lastSentAt, now)) continue;
      const recipients = parseRecipients(s.recipients);
      if (recipients.length === 0) continue;
      const ctx: TenantContext = { companyId: s.companyId, userId: 'system', role: 'OWNER', correlationId: 'digest' } as TenantContext;
      await runWithTenant(ctx, async () => {
        await this.sender.send(recipients, s.frequency);
        await this.repo.markSent(now);
      });
      sent += 1;
    }
    return { sent };
  }
}
