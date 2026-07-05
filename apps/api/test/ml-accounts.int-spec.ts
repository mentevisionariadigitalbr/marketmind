import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaMarketplaceAccountRepository } from '@marketmind/integration-core';

/**
 * Integration (Fase 3, Inc.1): listByCompany isola as contas por empresa e não
 * expõe tokens. Postgres real.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const A = 'aa11aa11-1111-1111-1111-111111111111';
const B = 'bb22bb22-2222-2222-2222-222222222222';
const ACC_A = 'aa110000-0000-0000-0000-000000000001';
const ACC_B = 'bb220000-0000-0000-0000-000000000001';

describe('MarketplaceAccount.listByCompany (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let repo: PrismaMarketplaceAccountRepository;

  const clean = async () => {
    await owner.marketplaceAccount.deleteMany({ where: { companyId: { in: [A, B] } } });
    await owner.company.deleteMany({ where: { id: { in: [A, B] } } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    const ml = await owner.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' }, update: {} });
    await clean();
    for (const [id, accId, ext] of [[A, ACC_A, 'a-ext'], [B, ACC_B, 'b-ext']] as const) {
      await owner.company.create({ data: { id, name: `Co ${id.slice(0, 2)}` } });
      await owner.marketplaceAccount.create({
        data: { id: accId, companyId: id, marketplaceId: ml.id, externalUserId: ext, nickname: `LOJA-${id.slice(0, 2)}`, accessTokenEnc: 'secret-access', refreshTokenEnc: 'secret-refresh', tokenExpiresAt: new Date(Date.now() + 3_600_000) },
      });
    }
    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaMarketplaceAccountRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('retorna só as contas da empresa e sem tokens', async () => {
    const a = await repo.listByCompany(A);
    expect(a).toHaveLength(1);
    expect(a[0].nickname).toBe('LOJA-aa');
    expect(a[0].marketplaceName).toBe('Mercado Livre');
    expect(JSON.stringify(a[0])).not.toContain('secret-');

    const b = await repo.listByCompany(B);
    expect(b.map((x) => x.id)).toEqual([ACC_B]);
  });
});
