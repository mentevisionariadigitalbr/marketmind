/**
 * God account seed — provisiona uma conta com TODAS as funções ("modo god"):
 * OWNER de uma empresa própria + plano BUSINESS ativo (sem paywall) + admin de
 * plataforma (backoffice /admin) + aceite legal + dataset de negócio populado.
 * Idempotente. Executar: ts-node prisma/god-seed.ts
 */
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { seedBusinessData } from './seed-business-data';

const prisma = new PrismaClient();

const EMAIL = 'mentevisionariadigital@gmail.com';
const PASSWORD = 'Vision@2026';
const OWNER_ROLE_ID = '00000000-0000-0000-0000-000000000001'; // ID fixo do papel OWNER (ver seed.ts)

async function main(): Promise<void> {
  const ownerRole = await prisma.role.findUnique({ where: { id: OWNER_ROLE_ID } });
  const business = await prisma.plan.findUnique({ where: { code: 'BUSINESS' } });
  if (!ownerRole || !business) {
    throw new Error('Papel OWNER ou plano BUSINESS ausentes — rode o seed principal (db:seed) antes.');
  }

  const passwordHash = await hash(PASSWORD);

  // Empresa + usuário (idempotente por e-mail).
  const existing = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true, companyId: true } });
  let companyId: string;
  let userId: string;
  if (existing) {
    companyId = existing.companyId;
    userId = existing.id;
    await prisma.user.update({ where: { id: userId }, data: { passwordHash, role: UserRole.OWNER, name: 'Vision', status: 'ACTIVE', emailVerifiedAt: new Date() } });
  } else {
    const company = await prisma.company.create({ data: { name: 'MarketMind — Vision', taxRegime: 'SIMPLES_NACIONAL' } });
    const user = await prisma.user.create({
      data: { companyId: company.id, name: 'Vision', email: EMAIL, passwordHash, role: UserRole.OWNER, status: 'ACTIVE', emailVerifiedAt: new Date() },
    });
    companyId = company.id;
    userId = user.id;
  }

  // OWNER no RBAC (todas as permissões).
  await prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId, roleId: OWNER_ROLE_ID } },
    create: { userId, roleId: OWNER_ROLE_ID },
    update: {},
  });

  // Assinatura BUSINESS ativa (sem paywall/limites).
  await prisma.subscription.upsert({
    where: { companyId },
    create: { companyId, planId: business.id, status: 'ACTIVE', provider: 'seed' },
    update: { planId: business.id, status: 'ACTIVE' },
  });

  // Aceite legal (sem pendências).
  await prisma.legalAcceptance.deleteMany({ where: { companyId, userId } });
  await prisma.legalAcceptance.createMany({
    data: [
      { companyId, userId, documentType: 'TERMS', version: '1.0' },
      { companyId, userId, documentType: 'PRIVACY', version: '1.0' },
    ],
  });

  // Admin da plataforma (mesmo e-mail/senha) — acesso ao backoffice /admin.
  await prisma.platformAdmin.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, name: 'Vision (God)', passwordHash },
    update: { passwordHash, name: 'Vision (God)' },
  });

  // Dados de negócio populados.
  const { products, orders } = await seedBusinessData(prisma, companyId, 'GOD');

  console.log('God account OK:');
  console.log(`  App:   ${EMAIL} / ${PASSWORD}  (OWNER, plano BUSINESS)`);
  console.log(`  Admin: ${EMAIL} / ${PASSWORD}  (/admin/login)`);
  console.log(`  Empresa ${companyId}: ${products} produtos, ${orders} pedidos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
