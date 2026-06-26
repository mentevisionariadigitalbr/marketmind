import {
  DigestSender,
  UpsertSubscriptionUseCase,
  SendDigestNowUseCase,
  RunDueDigestsUseCase,
  parseRecipients,
} from './report.use-cases';
import {
  DueSubscription,
  ReportSubscription,
  ReportSubscriptionRepository,
  UpsertSubscriptionData,
} from '../domain/ports/report-subscription.repository';
import { DigestDataRepository } from '../domain/ports/digest-data.repository';
import { EmailSender, EmailMessage } from '../../../shared/mail/email-sender.port';
import { NotFoundError, ValidationError } from '../../iam/application/errors';
import type { DigestData } from './digest';

class FakeSubRepo implements ReportSubscriptionRepository {
  sub: ReportSubscription | null = null;
  enabled: DueSubscription[] = [];
  upserts: UpsertSubscriptionData[] = [];
  markedSent = 0;
  async getByCompany() {
    return this.sub;
  }
  async upsert(data: UpsertSubscriptionData) {
    this.upserts.push(data);
  }
  async markSent() {
    this.markedSent += 1;
  }
  async listEnabled() {
    return this.enabled;
  }
}

class FakeDigest implements DigestDataRepository {
  async forCompany(): Promise<DigestData> {
    return { companyName: 'X', revenue7d: 100, orders7d: 1, units7d: 1, outOfStock: 0, lowStock: 0, payablesPending: 0, payablesOverdue: 0 };
  }
}

class FakeEmail implements EmailSender {
  sent: EmailMessage[] = [];
  async send(m: EmailMessage) {
    this.sent.push(m);
  }
}

describe('parseRecipients', () => {
  it('separa, normaliza e descarta inválidos', () => {
    expect(parseRecipients('a@x.com, b@y.com; lixo')).toEqual(['a@x.com', 'b@y.com']);
  });
});

describe('UpsertSubscriptionUseCase', () => {
  it('exige e-mail válido para ativar', async () => {
    const repo = new FakeSubRepo();
    await expect(new UpsertSubscriptionUseCase(repo).execute({ enabled: true, recipients: 'invalido' })).rejects.toBeInstanceOf(ValidationError);
  });
  it('normaliza e salva', async () => {
    const repo = new FakeSubRepo();
    await new UpsertSubscriptionUseCase(repo).execute({ frequency: 'DAILY', enabled: true, recipients: 'a@x.com ,b@y.com' });
    expect(repo.upserts[0]).toMatchObject({ frequency: 'DAILY', enabled: true, recipients: 'a@x.com, b@y.com' });
  });
});

describe('SendDigestNowUseCase', () => {
  it('falha sem assinatura', async () => {
    const repo = new FakeSubRepo();
    const sender = new DigestSender(new FakeDigest(), new FakeEmail());
    await expect(new SendDigestNowUseCase(repo, sender).execute()).rejects.toBeInstanceOf(NotFoundError);
  });
  it('envia para cada destinatário', async () => {
    const repo = new FakeSubRepo();
    repo.sub = { frequency: 'WEEKLY', recipients: 'a@x.com, b@y.com', enabled: true, lastSentAt: null };
    const email = new FakeEmail();
    const res = await new SendDigestNowUseCase(repo, new DigestSender(new FakeDigest(), email)).execute();
    expect(res.sentTo).toBe(2);
    expect(email.sent).toHaveLength(2);
  });
});

describe('RunDueDigestsUseCase', () => {
  it('envia apenas as assinaturas devidas e marca como enviadas', async () => {
    const repo = new FakeSubRepo();
    const now = new Date('2026-06-26T12:00:00Z');
    repo.enabled = [
      { companyId: 'c1', frequency: 'DAILY', recipients: 'a@x.com', lastSentAt: null }, // devida
      { companyId: 'c2', frequency: 'DAILY', recipients: 'b@y.com', lastSentAt: now }, // recém-enviada
    ];
    const email = new FakeEmail();
    const res = await new RunDueDigestsUseCase(repo, new DigestSender(new FakeDigest(), email)).execute(now);
    expect(res.sent).toBe(1);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('a@x.com');
    expect(repo.markedSent).toBe(1);
  });
});
