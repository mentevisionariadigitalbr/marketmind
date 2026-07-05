/**
 * Demo data seed — popula a empresa do usuário demo com um dataset realista para
 * que TODOS os dashboards mostrem números. Idempotente. Executar: ts-node prisma/demo-seed.ts
 */
import { PrismaClient } from '@prisma/client';
import { seedBusinessData } from './seed-business-data';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@marketmind.ai' }, select: { companyId: true } });
  if (!demoUser) throw new Error('Usuário demo@marketmind.ai não encontrado — rode o seed principal (db:seed) antes.');

  const { products, orders } = await seedBusinessData(prisma, demoUser.companyId, 'DEMO');
  console.log(`Demo seed OK — empresa ${demoUser.companyId}: ${products} produtos, ${orders} pedidos, 2 fornecedores, 1 compra + 1 conta a pagar.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
