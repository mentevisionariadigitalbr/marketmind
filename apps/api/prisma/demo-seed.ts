/**
 * Demo data seed — popula a empresa do usuário demo com um dataset realista
 * (produtos, custos, estoque, fornecedores, ~90 dias de pedidos, 1 compra recebida
 * e 1 conta a pagar) para que TODOS os dashboards mostrem números. Idempotente:
 * limpa os dados da empresa demo e recria. Executar: ts-node prisma/demo-seed.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const DAY = 86_400_000;
const now = Date.now();

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function money(v: number): Prisma.Decimal {
  return new Prisma.Decimal(Math.round(v * 100) / 100);
}

const CATEGORIES = [
  { externalId: 'MLB-CASA', name: 'Casa & Decoração' },
  { externalId: 'MLB-ELETRO', name: 'Eletrônicos' },
  { externalId: 'MLB-ESPORTE', name: 'Esporte & Lazer' },
  { externalId: 'MLB-PET', name: 'Pet Shop' },
];

const PRODUCTS = [
  { sku: 'CASA-001', title: 'Jogo de Panelas Antiaderente 5pç', brand: 'CookPro', cat: 'MLB-CASA', price: 289.9, stock: 42 },
  { sku: 'CASA-002', title: 'Luminária de Mesa LED Articulada', brand: 'LumiHome', cat: 'MLB-CASA', price: 119.9, stock: 8 },
  { sku: 'CASA-003', title: 'Conjunto 4 Potes Herméticos', brand: 'FreshKeep', cat: 'MLB-CASA', price: 59.9, stock: 130 },
  { sku: 'CASA-004', title: 'Tapete Antiderrapante 1,40x2,00', brand: 'SoftStep', cat: 'MLB-CASA', price: 199.0, stock: 3 },
  { sku: 'ELET-001', title: 'Fone Bluetooth TWS à Prova Dágua', brand: 'SoundX', cat: 'MLB-ELETRO', price: 159.9, stock: 64 },
  { sku: 'ELET-002', title: 'Carregador Turbo 30W USB-C', brand: 'PowerFast', cat: 'MLB-ELETRO', price: 79.9, stock: 0 },
  { sku: 'ELET-003', title: 'Smartwatch Fitness Tela AMOLED', brand: 'FitWatch', cat: 'MLB-ELETRO', price: 349.0, stock: 21 },
  { sku: 'ELET-004', title: 'Webcam Full HD 1080p com Microfone', brand: 'ClearCam', cat: 'MLB-ELETRO', price: 139.9, stock: 5 },
  { sku: 'ELET-005', title: 'Suporte Articulado para Notebook', brand: 'ErgoDesk', cat: 'MLB-ELETRO', price: 89.9, stock: 75 },
  { sku: 'ESP-001', title: 'Kit 2 Halteres Ajustáveis 10kg', brand: 'IronFit', cat: 'MLB-ESPORTE', price: 259.0, stock: 18 },
  { sku: 'ESP-002', title: 'Tapete de Yoga TPE 6mm', brand: 'ZenFlow', cat: 'MLB-ESPORTE', price: 99.9, stock: 47 },
  { sku: 'ESP-003', title: 'Garrafa Térmica Inox 1L', brand: 'ThermoGo', cat: 'MLB-ESPORTE', price: 69.9, stock: 92 },
  { sku: 'ESP-004', title: 'Corda de Pular com Rolamento', brand: 'JumpPro', cat: 'MLB-ESPORTE', price: 39.9, stock: 2 },
  { sku: 'PET-001', title: 'Cama Pet Redonda Aconchegante M', brand: 'PetCozy', cat: 'MLB-PET', price: 129.9, stock: 33 },
  { sku: 'PET-002', title: 'Comedouro Automático 3L', brand: 'FeedSmart', cat: 'MLB-PET', price: 189.9, stock: 14 },
  { sku: 'PET-003', title: 'Kit 3 Brinquedos Mordedor', brand: 'PlayPet', cat: 'MLB-PET', price: 49.9, stock: 0 },
];

async function main(): Promise<void> {
  const demoUser = await prisma.user.findUnique({ where: { email: 'demo@marketmind.ai' }, select: { companyId: true } });
  if (!demoUser) throw new Error('Usuário demo@marketmind.ai não encontrado — rode o seed principal antes.');
  const companyId = demoUser.companyId;

  // ── Limpeza idempotente dos dados de negócio da empresa demo ──
  await prisma.payable.deleteMany({ where: { companyId } });
  await prisma.purchaseOrder.deleteMany({ where: { companyId } });
  await prisma.stockMovement.deleteMany({ where: { companyId } });
  await prisma.marketplaceAccount.deleteMany({ where: { companyId } }); // cascateia produtos/pedidos/inventário/custos
  await prisma.supplier.deleteMany({ where: { companyId } });

  // ── Categorias (globais) ──
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { externalId: c.externalId }, update: { name: c.name }, create: c });
  }

  // ── Conta de marketplace (ML) ──
  const ml = await prisma.marketplace.upsert({ where: { code: 'MERCADO_LIVRE' }, update: {}, create: { code: 'MERCADO_LIVRE', name: 'Mercado Livre' } });
  const account = await prisma.marketplaceAccount.create({
    data: {
      companyId,
      marketplaceId: ml.id,
      externalUserId: 'demo-ml',
      nickname: 'LOJA_DEMO',
      accessTokenEnc: '-',
      refreshTokenEnc: '-',
      tokenExpiresAt: new Date(now + 365 * DAY),
      lastSyncedAt: new Date(),
    },
  });

  // ── Fornecedores ──
  const supA = await prisma.supplier.create({ data: { companyId, name: 'Distribuidora Nacional', leadTimeDays: 10, paymentTermDays: 30, active: true } });
  const supB = await prisma.supplier.create({ data: { companyId, name: 'Importadora Express', leadTimeDays: 25, paymentTermDays: 45, active: true } });
  const suppliers = [supA, supB];

  // ── Produtos + variante + inventário + custo ──
  const created: { id: string; sku: string; title: string; price: number }[] = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const supplier = suppliers[i % 2];
    const product = await prisma.product.create({
      data: {
        companyId,
        marketplaceAccountId: account.id,
        externalId: `MLB-DEMO-${p.sku}`,
        sku: p.sku,
        title: p.title,
        brand: p.brand,
        status: 'active',
        price: money(p.price),
        availableQuantity: p.stock,
        categoryId: p.cat,
        supplierId: supplier.id,
        listingType: 'gold_special',
      },
    });
    const variant = await prisma.productVariant.create({
      data: { companyId, productId: product.id, externalId: `${product.externalId}-v1`, sku: p.sku, availableQuantity: p.stock, price: money(p.price) },
    });
    await prisma.inventory.create({ data: { companyId, productId: product.id, variantId: variant.id, available: p.stock, reserved: 0 } });
    // custo ~ 52–63% do preço → margem saudável
    await prisma.productCost.create({
      data: { companyId, productId: product.id, acquisitionCost: money(p.price * rnd(0.52, 0.63)), validFrom: new Date(now - 120 * DAY) },
    });
    created.push({ id: product.id, sku: p.sku, title: p.title, price: p.price });
  }

  // ── Pedidos ao longo de 90 dias (PAID) ──
  let orderSeq = 0;
  for (let d = 89; d >= 0; d--) {
    const ordersToday = Math.round(rnd(1, 5));
    for (let k = 0; k < ordersToday; k++) {
      const prod = pick(created);
      const qty = Math.round(rnd(1, 3));
      // promoção eventual: 15% dos pedidos com 10% de desconto
      const unit = Math.random() < 0.15 ? prod.price * 0.9 : prod.price;
      const gross = unit * qty;
      const orderedAt = new Date(now - d * DAY - Math.floor(rnd(0, DAY)));
      const order = await prisma.order.create({
        data: {
          companyId,
          marketplaceAccountId: account.id,
          externalId: `DEMO-ORD-${orderSeq++}`,
          status: 'PAID',
          currency: 'BRL',
          orderedAt,
          grossAmount: money(gross),
          commissionAmount: money(gross * 0.12),
          freightAmount: money(rnd(0, 18)),
        },
      });
      await prisma.orderItem.create({
        data: { companyId, orderId: order.id, productId: prod.id, externalItemId: `${order.externalId}-1`, sku: prod.sku, title: prod.title, quantity: qty, unitPrice: money(unit) },
      });
    }
  }

  // ── 1 compra recebida + conta a pagar (popula Compras / Fluxo de Caixa) ──
  const buyProduct = created[0];
  const po = await prisma.purchaseOrder.create({
    data: { companyId, supplierId: supA.id, status: 'RECEIVED', receivedAt: new Date(now - 12 * DAY), notes: 'Reposição inicial' },
  });
  await prisma.purchaseOrderItem.create({
    data: { companyId, purchaseOrderId: po.id, productId: buyProduct.id, quantity: 50, unitCost: money(buyProduct.price * 0.55), receivedQuantity: 50 },
  });
  await prisma.stockMovement.create({
    data: { companyId, productId: buyProduct.id, type: 'ENTRADA', quantity: 50, balanceAfter: 92, unitCost: money(buyProduct.price * 0.55), referenceType: 'purchase_order', referenceId: po.id },
  });
  await prisma.payable.create({
    data: { companyId, supplierId: supA.id, sourceType: 'purchase_order', sourceId: po.id, description: 'Compra recebida', amount: money(buyProduct.price * 0.55 * 50), dueDate: new Date(now + 18 * DAY) },
  });

  const orders = await prisma.order.count({ where: { companyId } });
  console.log(`Demo seed OK — empresa ${companyId}: ${created.length} produtos, ${orders} pedidos, 2 fornecedores, 1 compra + 1 conta a pagar.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
