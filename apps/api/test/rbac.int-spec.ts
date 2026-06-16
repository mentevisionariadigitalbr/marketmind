import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { PrismaRbacRepository } from '../src/modules/iam/infrastructure/persistence/prisma-rbac.repository';
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLES,
  SYSTEM_ROLE_PERMISSIONS,
  SystemRoleName,
} from '../src/modules/iam/domain/permissions';

const OWNER_URL =
  process.env.DATABASE_URL ??
  'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL =
  process.env.APP_DATABASE_URL ??
  'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const ROLE_IDS: Record<SystemRoleName, string> = {
  OWNER: '00000000-0000-0000-0000-000000000001',
  ADMIN: '00000000-0000-0000-0000-000000000002',
  MEMBER: '00000000-0000-0000-0000-000000000003',
};
const COMPANY_ID = '33333333-3333-3333-3333-333333333333';
const USER_ID = '44444444-4444-4444-4444-444444444444';

async function ensureCatalog(db: PrismaClient): Promise<void> {
  for (const p of PERMISSION_CATALOG) {
    await db.permission.upsert({
      where: { key: p.key },
      create: { key: p.key, description: p.description },
      update: {},
    });
  }
  const permByKey = new Map((await db.permission.findMany()).map((p) => [p.key, p.id] as const));
  for (const name of Object.keys(SYSTEM_ROLE_PERMISSIONS) as SystemRoleName[]) {
    await db.role.upsert({
      where: { id: ROLE_IDS[name] },
      create: { id: ROLE_IDS[name], name, isSystem: true },
      update: { isSystem: true },
    });
    await db.rolePermission.createMany({
      data: SYSTEM_ROLE_PERMISSIONS[name].map((key) => ({
        roleId: ROLE_IDS[name],
        permissionId: permByKey.get(key)!,
      })),
      skipDuplicates: true,
    });
  }
}

describe('RBAC repository (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let rbac: PrismaRbacRepository;

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await ensureCatalog(owner);
    await owner.userRoleAssignment.deleteMany({ where: { userId: USER_ID } });
    await owner.user.deleteMany({ where: { id: USER_ID } });
    await owner.company.deleteMany({ where: { id: COMPANY_ID } });
    await owner.company.create({ data: { id: COMPANY_ID, name: 'RBAC Co' } });
    await owner.user.create({
      data: { id: USER_ID, companyId: COMPANY_ID, name: 'Rita', email: 'rita@rbac.com' },
    });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    rbac = new PrismaRbacRepository(prisma);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await owner?.userRoleAssignment.deleteMany({ where: { userId: USER_ID } });
    await owner?.user.deleteMany({ where: { id: USER_ID } });
    await owner?.company.deleteMany({ where: { id: COMPANY_ID } });
    await owner?.$disconnect();
  });

  it('MEMBER recebe permissões de leitura, sem iam:write', async () => {
    await rbac.assignSystemRole(USER_ID, SYSTEM_ROLES.MEMBER);
    const authz = await rbac.getEffectiveAuthorization(USER_ID);

    expect(authz.roles).toEqual(['MEMBER']);
    expect(authz.permissions).toContain('finance:read');
    expect(authz.permissions).not.toContain('iam:write');
    expect(authz.permissions).not.toContain('finance:write');
  });

  it('adicionar OWNER expande para todas as permissões (união dos papéis)', async () => {
    await rbac.assignSystemRole(USER_ID, SYSTEM_ROLES.OWNER);
    const authz = await rbac.getEffectiveAuthorization(USER_ID);

    expect(authz.roles.sort()).toEqual(['MEMBER', 'OWNER']);
    expect(authz.permissions).toContain('iam:write');
    expect(authz.permissions).toContain('company:write');
  });

  it('assignSystemRole é idempotente', async () => {
    await rbac.assignSystemRole(USER_ID, SYSTEM_ROLES.OWNER);
    const count = await owner.userRoleAssignment.count({
      where: { userId: USER_ID, roleId: ROLE_IDS.OWNER },
    });
    expect(count).toBe(1);
  });

  it('listRoles retorna os papéis de sistema com suas permissões', async () => {
    const roles = await rbac.listRoles(COMPANY_ID);
    const names = roles.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['OWNER', 'ADMIN', 'MEMBER']));
    const owner = roles.find((r) => r.name === 'OWNER');
    expect(owner?.permissions.length).toBe(PERMISSION_CATALOG.length);
  });
});
