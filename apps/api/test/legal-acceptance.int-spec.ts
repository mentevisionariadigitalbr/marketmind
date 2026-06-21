import { PrismaClient } from '@prisma/client';
import { PrismaService, runWithTenant } from '@marketmind/kernel';
import { PrismaLegalAcceptanceRepository } from '../src/modules/legal/infrastructure/persistence/prisma-legal-acceptance.repository';
import { RecordLegalAcceptanceService } from '../src/modules/legal/application/record-legal-acceptance.service';
import { LEGAL_VERSIONS } from '../src/modules/legal/domain/legal-documents';

/**
 * Integration (Fase 6, Inc.1): aceite legal versionado contra Postgres. Critérios:
 * o aceite é gravado (TERMS+PRIVACY com versão) e isolado por company (RLS).
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY_A = 'a6a6a6a6-7777-7777-7777-777777777701';
const COMPANY_B = 'a6a6a6a6-7777-7777-7777-777777777702';
const USER_A = 'a6a6a6a6-7777-7777-7777-7777777777a1';

describe('Legal acceptance — registro + RLS (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let service: RecordLegalAcceptanceService;
  let repo: PrismaLegalAcceptanceRepository;

  const clean = async () => {
    await owner.legalAcceptance.deleteMany({ where: { companyId: { in: [COMPANY_A, COMPANY_B] } } });
    await owner.user.deleteMany({ where: { companyId: { in: [COMPANY_A, COMPANY_B] } } });
    await owner.company.deleteMany({ where: { id: { in: [COMPANY_A, COMPANY_B] } } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await clean();
    await owner.company.create({ data: { id: COMPANY_A, name: 'Empresa A' } });
    await owner.company.create({ data: { id: COMPANY_B, name: 'Empresa B' } });
    await owner.user.create({ data: { id: USER_A, companyId: COMPANY_A, name: 'Ana', email: 'ana@legal.com' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repo = new PrismaLegalAcceptanceRepository(prisma);
    service = new RecordLegalAcceptanceService(repo);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await clean();
    await owner.$disconnect();
  });

  it('grava aceite de TERMS + PRIVACY com a versão vigente (fluxo de bootstrap)', async () => {
    // Cadastro roda sem tenant (GUC vazia → RLS aberta).
    await service.acceptAll({ userId: USER_A, companyId: COMPANY_A, ip: '1.2.3.4', userAgent: 'jest' });

    const rows = await owner.legalAcceptance.findMany({ where: { userId: USER_A }, orderBy: { documentType: 'asc' } });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.documentType).sort()).toEqual(['PRIVACY', 'TERMS']);
    const terms = rows.find((r) => r.documentType === 'TERMS')!;
    expect(terms.version).toBe(LEGAL_VERSIONS.TERMS);
    expect(terms.ip).toBe('1.2.3.4');
  });

  it('RLS: aceites da empresa A não aparecem no contexto da empresa B', async () => {
    const fromB = await runWithTenant({ companyId: COMPANY_B, userId: 'b', role: 'OWNER' }, () =>
      prisma.runInTransaction(() => prisma.db.legalAcceptance.findMany()),
    );
    expect(fromB.every((r) => r.companyId !== COMPANY_A)).toBe(true);

    const fromA = await runWithTenant({ companyId: COMPANY_A, userId: USER_A, role: 'OWNER' }, () =>
      repo.listForUser(USER_A),
    );
    expect(fromA).toHaveLength(2);
  });
});
