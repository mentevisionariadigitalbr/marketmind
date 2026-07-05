import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant, TenantContext } from '@marketmind/kernel';
import { PrismaReportSubscriptionRepository } from '../src/modules/reports/infrastructure/persistence/prisma-report-subscription.repository';
import { PrismaDigestDataRepository } from '../src/modules/reports/infrastructure/persistence/prisma-digest-data.repository';
import {
  DigestSender,
  UpsertSubscriptionUseCase,
  GetSubscriptionUseCase,
  SendDigestNowUseCase,
  RunDueDigestsUseCase,
} from '../src/modules/reports/application/report.use-cases';
import { EmailSender, EmailMessage } from '../src/shared/mail/email-sender.port';

/**
 * Integration (Fase 3, Inc.3): relatórios por e-mail. Assinatura + dados do digest,
 * envio sob demanda, agendador cross-tenant e RLS.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const SUFFIX = `rep-int-${Date.now()}`;
const DAY = 86_400_000;

function tenant(companyId: string): TenantContext {
  return { companyId, userId: 'u-int', role: 'OWNER', correlationId: SUFFIX } as TenantContext;
}

class FakeEmail implements EmailSender {
  sent: EmailMessage[] = [];
  async send(m: EmailMessage) {
    this.sent.push(m);
  }
}

describe('Reports — email digest (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let email: FakeEmail;
  let subRepo: PrismaReportSubscriptionRepository;
  let upsert: UpsertSubscriptionUseCase;
  let getSub: GetSubscriptionUseCase;
  let sendNow: SendDigestNowUseCase;
  let runDue: RunDueDigestsUseCase;

  let companyA = '';
  let companyB = '';

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const mk = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
    const company = await owner.company.create({ data: { name: `REP-${SUFFIX}` } });
    companyA = company.id;
    companyB = (await owner.company.create({ data: { name: `REPB-${SUFFIX}` } })).id;
    const acc = await owner.marketplaceAccount.create({
      data: { companyId: companyA, marketplaceId: mk.id, externalUserId: `ext-${SUFFIX}`, accessTokenEnc: 'x', refreshTokenEnc: 'x', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
    });
    const order = await owner.order.create({
      data: { companyId: companyA, marketplaceAccountId: acc.id, externalId: `ORD-${SUFFIX}`, status: 'PAID', orderedAt: new Date(Date.now() - 2 * DAY), grossAmount: 1000, commissionAmount: 100, freightAmount: 50 },
    });
    await owner.orderItem.create({ data: { companyId: companyA, orderId: order.id, externalItemId: `IT-${SUFFIX}`, title: 'item', quantity: 5, unitPrice: 200 } });
    await owner.payable.create({ data: { companyId: companyA, sourceType: 'manual', amount: 500, dueDate: new Date(Date.now() - DAY), status: 'PENDING' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    email = new FakeEmail();
    subRepo = new PrismaReportSubscriptionRepository(prisma);
    const sender = new DigestSender(new PrismaDigestDataRepository(prisma), email);
    upsert = new UpsertSubscriptionUseCase(subRepo);
    getSub = new GetSubscriptionUseCase(subRepo);
    sendNow = new SendDigestNowUseCase(subRepo, sender);
    runDue = new RunDueDigestsUseCase(subRepo, sender);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner.company.deleteMany({ where: { id: { in: [companyA, companyB].filter(Boolean) } } });
    await owner.$disconnect();
  });

  it('configura a assinatura e a lê de volta', async () => {
    await runWithTenant(tenant(companyA), () => upsert.execute({ frequency: 'DAILY', recipients: 'lojista@x.com', enabled: true }));
    const sub = await runWithTenant(tenant(companyA), () => getSub.execute());
    expect(sub).toMatchObject({ frequency: 'DAILY', recipients: 'lojista@x.com', enabled: true });
  });

  it('envia o digest com os números reais', async () => {
    email.sent = [];
    const res = await runWithTenant(tenant(companyA), () => sendNow.execute());
    expect(res.sentTo).toBe(1);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('lojista@x.com');
    expect(email.sent[0].html).toContain('R$'); // receita formatada
    expect(email.sent[0].text).toContain('500'); // contas a pagar vencidas
  });

  it('o agendador (cross-tenant) envia as devidas e marca como enviada', async () => {
    email.sent = [];
    // zera o lastSentAt para ficar devida
    await runWithTenant(tenant(companyA), () => upsert.execute({ frequency: 'DAILY', recipients: 'lojista@x.com', enabled: true }));
    const res = await runDue.execute(new Date());
    expect(res.sent).toBeGreaterThanOrEqual(1);
    const sub = await runWithTenant(tenant(companyA), () => getSub.execute());
    expect(sub?.lastSentAt).not.toBeNull();
  });

  it('RLS isola: a empresa B não vê a assinatura da empresa A', async () => {
    const fromB = await runWithTenant(tenant(companyB), () => getSub.execute());
    expect(fromB).toBeNull();
  });
});
