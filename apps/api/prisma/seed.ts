import { MarketplaceCode, PrismaClient, UserRole } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_DESCRIPTIONS,
  SYSTEM_ROLE_PERMISSIONS,
  SystemRoleName,
} from '../src/modules/iam/domain/permissions';

const prisma = new PrismaClient();

// IDs fixos para os papéis de sistema => seed idempotente.
const SYSTEM_ROLE_IDS: Record<SystemRoleName, string> = {
  OWNER: '00000000-0000-0000-0000-000000000001',
  ADMIN: '00000000-0000-0000-0000-000000000002',
  MEMBER: '00000000-0000-0000-0000-000000000003',
};

async function seedRbac(): Promise<void> {
  // 1. Catálogo de permissões.
  for (const perm of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: { key: perm.key, description: perm.description },
      update: { description: perm.description },
    });
  }
  const permByKey = new Map(
    (await prisma.permission.findMany()).map((p) => [p.key, p.id] as const),
  );

  // 2. Papéis de sistema + suas permissões.
  for (const name of Object.keys(SYSTEM_ROLE_PERMISSIONS) as SystemRoleName[]) {
    const id = SYSTEM_ROLE_IDS[name];
    await prisma.role.upsert({
      where: { id },
      create: { id, name, description: SYSTEM_ROLE_DESCRIPTIONS[name], isSystem: true },
      update: { description: SYSTEM_ROLE_DESCRIPTIONS[name], isSystem: true },
    });
    await prisma.rolePermission.createMany({
      data: SYSTEM_ROLE_PERMISSIONS[name].map((key) => ({
        roleId: id,
        permissionId: permByKey.get(key)!,
      })),
      skipDuplicates: true,
    });
  }
  console.log(
    `Seed: ${PERMISSION_CATALOG.length} permissões e ${Object.keys(SYSTEM_ROLE_IDS).length} papéis de sistema.`,
  );
}

async function seedDemoUser(): Promise<void> {
  const email = 'demo@marketmind.ai';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: existing.id, roleId: SYSTEM_ROLE_IDS.OWNER } },
      create: { userId: existing.id, roleId: SYSTEM_ROLE_IDS.OWNER },
      update: {},
    });
    console.log('Seed: usuário demo já existe (papel OWNER garantido).');
    return;
  }

  const company = await prisma.company.create({
    data: { name: 'Loja Demo MarketMind', taxRegime: 'SIMPLES_NACIONAL' },
  });
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Vendedor Demo',
      email,
      passwordHash: await hash('Demo@12345'),
      role: UserRole.OWNER,
    },
  });
  await prisma.userRoleAssignment.create({
    data: { userId: user.id, roleId: SYSTEM_ROLE_IDS.OWNER },
  });
  console.log(`Seed: empresa "${company.name}" + usuário ${email} (senha Demo@12345)`);
}

const MARKETPLACES: { code: MarketplaceCode; name: string }[] = [
  { code: 'MERCADO_LIVRE', name: 'Mercado Livre' },
  { code: 'SHOPEE', name: 'Shopee' },
  { code: 'AMAZON', name: 'Amazon' },
  { code: 'MAGALU', name: 'Magalu' },
];

async function seedMarketplaces(): Promise<void> {
  for (const m of MARKETPLACES) {
    await prisma.marketplace.upsert({
      where: { code: m.code },
      create: { code: m.code, name: m.name },
      update: { name: m.name },
    });
  }
  console.log(`Seed: ${MARKETPLACES.length} marketplaces.`);
}

async function main(): Promise<void> {
  await seedRbac();
  await seedMarketplaces();
  await seedDemoUser();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
