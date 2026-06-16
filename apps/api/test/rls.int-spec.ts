import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { runWithTenant, TenantContext } from '../src/shared/tenant/tenant-context';

/**
 * Integration test (requires the dockerized Postgres + applied migrations):
 *   pnpm --filter @marketmind/api db:up   # or: docker compose -f infra/docker-compose.yml up -d postgres
 *   pnpm --filter @marketmind/api prisma:migrate
 *   pnpm --filter @marketmind/api test:int
 *
 * Proves ADR-0002: with a tenant context set, the RLS policies make another
 * tenant's rows invisible and unwritable — even though the SQL has no explicit
 * company_id filter. This is the Sprint 1 acceptance criterion
 * "Tenant A não lê dados do tenant B".
 */
const OWNER_URL =
  process.env.DATABASE_URL ??
  'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL =
  process.env.APP_DATABASE_URL ??
  'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

const asA = (): TenantContext => ({ companyId: TENANT_A, userId: 'u-a', role: 'OWNER' });
const asB = (): TenantContext => ({ companyId: TENANT_B, userId: 'u-b', role: 'OWNER' });

describe('RLS tenant isolation (ADR-0002)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Owner connection (superuser) bypasses RLS — used only to seed/clean.
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await owner.$executeRawUnsafe('DELETE FROM users');
    await owner.$executeRawUnsafe('DELETE FROM companies');
    await owner.company.create({ data: { id: TENANT_A, name: 'Tenant A' } });
    await owner.company.create({ data: { id: TENANT_B, name: 'Tenant B' } });
    await owner.user.create({
      data: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', companyId: TENANT_A, name: 'Alice', email: 'alice@a.com' },
    });
    await owner.user.create({
      data: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', companyId: TENANT_B, name: 'Bob', email: 'bob@b.com' },
    });

    // Runtime connection: least-privilege role, subject to RLS.
    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner?.$executeRawUnsafe('DELETE FROM users');
    await owner?.$executeRawUnsafe('DELETE FROM companies');
    await owner?.$disconnect();
  });

  it('tenant A sees only its own users', async () => {
    const users = await runWithTenant(asA(), () =>
      prisma.runInTransaction(() => prisma.db.user.findMany()),
    );
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('alice@a.com');
  });

  it('tenant B sees only its own users (symmetry)', async () => {
    const users = await runWithTenant(asB(), () =>
      prisma.runInTransaction(() => prisma.db.user.findMany()),
    );
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('bob@b.com');
  });

  it("tenant A cannot read tenant B's company", async () => {
    const company = await runWithTenant(asA(), () =>
      prisma.runInTransaction(() => prisma.db.company.findUnique({ where: { id: TENANT_B } })),
    );
    expect(company).toBeNull();
  });

  it("tenant A cannot update tenant B's rows (write isolation)", async () => {
    const result = await runWithTenant(asA(), () =>
      prisma.runInTransaction(() =>
        prisma.db.company.updateMany({ where: { id: TENANT_B }, data: { name: 'HACKED' } }),
      ),
    );
    expect(result.count).toBe(0);

    // Confirm tenant B's name is untouched (checked via the owner connection).
    const b = await owner.company.findUnique({ where: { id: TENANT_B } });
    expect(b?.name).toBe('Tenant B');
  });

  it('tenant A cannot insert a row into tenant B (WITH CHECK)', async () => {
    await expect(
      runWithTenant(asA(), () =>
        prisma.runInTransaction(() =>
          prisma.db.user.create({
            data: { companyId: TENANT_B, name: 'Mallory', email: 'mallory@b.com' },
          }),
        ),
      ),
    ).rejects.toThrow();
  });
});
