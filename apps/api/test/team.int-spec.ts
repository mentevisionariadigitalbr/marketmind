import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@marketmind/kernel';
import { PrismaUserRepository } from '../src/modules/iam/infrastructure/persistence/prisma-user.repository';
import { PrismaRbacRepository } from '../src/modules/iam/infrastructure/persistence/prisma-rbac.repository';
import { InviteMemberUseCase } from '../src/modules/iam/application/use-cases/invite-member.use-case';
import { AcceptInviteUseCase } from '../src/modules/iam/application/use-cases/accept-invite.use-case';
import { AssignRoleUseCase } from '../src/modules/iam/application/use-cases/assign-role.use-case';
import { FakeTokenService, FakePasswordHasher } from '../src/modules/iam/application/__fixtures__/in-memory.fixture';
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_PERMISSIONS,
  SystemRoleName,
} from '../src/modules/iam/domain/permissions';

/**
 * Integration (Fase 3, Inc.3): convite → aceite → papel correto via RBAC real.
 * Critério de aceite: membro convidado recebe o papel e só as permissões dele.
 */
const OWNER_URL = process.env.DATABASE_URL ?? 'postgresql://marketmind:marketmind@localhost:5433/marketmind?schema=public';
const APP_URL = process.env.APP_DATABASE_URL ?? 'postgresql://marketmind_app:marketmind_app@localhost:5433/marketmind?schema=public';

const COMPANY = 'a9a9a9a9-1111-1111-1111-111111111111';
const ROLE_IDS: Record<SystemRoleName, string> = {
  OWNER: '00000000-0000-0000-0000-000000000001',
  ADMIN: '00000000-0000-0000-0000-000000000002',
  MEMBER: '00000000-0000-0000-0000-000000000003',
};

async function ensureCatalog(db: PrismaClient): Promise<void> {
  for (const p of PERMISSION_CATALOG) {
    await db.permission.upsert({ where: { key: p.key }, create: { key: p.key, description: p.description }, update: {} });
  }
  const permByKey = new Map((await db.permission.findMany()).map((p) => [p.key, p.id] as const));
  for (const name of Object.keys(SYSTEM_ROLE_PERMISSIONS) as SystemRoleName[]) {
    await db.role.upsert({ where: { id: ROLE_IDS[name] }, create: { id: ROLE_IDS[name], name, isSystem: true }, update: { isSystem: true } });
    await db.rolePermission.createMany({
      data: SYSTEM_ROLE_PERMISSIONS[name].map((key) => ({ roleId: ROLE_IDS[name], permissionId: permByKey.get(key)! })),
      skipDuplicates: true,
    });
  }
}

describe('Team — convite/aceite/papel (integration)', () => {
  let owner: PrismaClient;
  let prisma: PrismaService;
  let invite: InviteMemberUseCase;
  let accept: AcceptInviteUseCase;
  let assign: AssignRoleUseCase;

  const cleanMembers = async () => {
    const users = await owner.user.findMany({ where: { companyId: COMPANY }, select: { id: true } });
    await owner.userRoleAssignment.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
    await owner.user.deleteMany({ where: { companyId: COMPANY } });
  };

  beforeAll(async () => {
    owner = new PrismaClient({ datasourceUrl: OWNER_URL });
    await ensureCatalog(owner);
    await cleanMembers();
    await owner.company.deleteMany({ where: { id: COMPANY } });
    await owner.company.create({ data: { id: COMPANY, name: 'Co Equipe' } });

    process.env.APP_DATABASE_URL = APP_URL;
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const users = new PrismaUserRepository(prisma);
    const rbac = new PrismaRbacRepository(prisma);
    const tokens = new FakeTokenService();
    invite = new InviteMemberUseCase(prisma, users, rbac, tokens);
    accept = new AcceptInviteUseCase(users, tokens, new FakePasswordHasher());
    assign = new AssignRoleUseCase(users, rbac);
  });

  afterAll(async () => {
    await prisma?.onModuleDestroy();
    await cleanMembers();
    await owner.company.deleteMany({ where: { id: COMPANY } });
    await owner.$disconnect();
  });

  it('convite cria membro INVITED com permissões de MEMBER (sem iam:write)', async () => {
    await cleanMembers();
    await invite.execute({ companyId: COMPANY, email: 'mem@x.com', name: 'Mem', role: 'MEMBER' });

    const user = await owner.user.findFirst({ where: { email: 'mem@x.com' } });
    expect(user?.status).toBe('INVITED');
    expect(user?.inviteTokenHash).toBeTruthy();

    const rbac = new PrismaRbacRepository(prisma);
    const authz = await rbac.getEffectiveAuthorization(user!.id);
    expect(authz.roles).toEqual(['MEMBER']);
    expect(authz.permissions).toContain('dashboard:read');
    expect(authz.permissions).not.toContain('iam:write');
  });

  it('aceite ativa o membro e limpa o convite', async () => {
    await cleanMembers();
    const { token } = await invite.execute({ companyId: COMPANY, email: 'mem@x.com', name: 'Mem', role: 'MEMBER' });
    await accept.execute({ token, password: 'senha-forte-1' });

    const user = await owner.user.findFirst({ where: { email: 'mem@x.com' } });
    expect(user?.status).toBe('ACTIVE');
    expect(user?.passwordHash).toBe('hashed:senha-forte-1');
    expect(user?.inviteTokenHash).toBeNull();
  });

  it('atribuir ADMIN substitui o papel (RBAC real)', async () => {
    await cleanMembers();
    await invite.execute({ companyId: COMPANY, email: 'mem@x.com', name: 'Mem', role: 'MEMBER' });
    const user = await owner.user.findFirst({ where: { email: 'mem@x.com' } });

    await assign.execute({ companyId: COMPANY, userId: user!.id, role: 'ADMIN' });

    const authz = await new PrismaRbacRepository(prisma).getEffectiveAuthorization(user!.id);
    expect(authz.roles).toEqual(['ADMIN']);
    expect(authz.permissions).toContain('finance:write');
  });
});
