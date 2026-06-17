import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  CatalogSyncRepository,
  NormalizedCategory,
  NormalizedProduct,
  UpsertProductResult,
} from '../../domain/ports/catalog-sync.repository';

/** Reexecuta em violação de unique (P2002) — convergência sob concorrência. */
async function withConflictRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 0; ; i += 1) {
    try {
      return await fn();
    } catch (err) {
      const isConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!isConflict || i >= attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 10 + Math.floor(Math.random() * 25)));
    }
  }
}

@Injectable()
export class PrismaCatalogSyncRepository implements CatalogSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertProduct(product: NormalizedProduct): Promise<UpsertProductResult> {
    return withConflictRetry(() => this.upsertProductOnce(product));
  }

  private async upsertProductOnce(product: NormalizedProduct): Promise<UpsertProductResult> {
    return this.prisma.runInTransaction(async () => {
      const db = this.prisma.db;

      const existing = await db.product.findUnique({
        where: {
          marketplaceAccountId_externalId: {
            marketplaceAccountId: product.marketplaceAccountId,
            externalId: product.externalId,
          },
        },
        select: { id: true, price: true },
      });

      const productData = {
        companyId: product.companyId,
        marketplaceAccountId: product.marketplaceAccountId,
        externalId: product.externalId,
        sku: product.sku ?? undefined,
        title: product.title,
        status: product.status,
        price: product.price ?? undefined,
        currency: product.currency,
        availableQuantity: product.availableQuantity,
        categoryId: product.categoryId ?? undefined,
        permalink: product.permalink ?? undefined,
        thumbnail: product.thumbnail ?? undefined,
        listingType: product.listingType ?? undefined,
        lastSyncedAt: new Date(),
      };

      const productId = existing
        ? (await db.product.update({ where: { id: existing.id }, data: productData, select: { id: true } })).id
        : (await db.product.create({ data: productData, select: { id: true } })).id;

      const oldPrice = existing?.price != null ? Number(existing.price) : null;
      const priceChanged = product.price != null && product.price !== oldPrice;
      if (priceChanged && product.price != null) {
        await db.productPrice.create({
          data: {
            companyId: product.companyId,
            productId,
            amount: product.price,
            currency: product.currency,
          },
        });
      }

      for (const variant of product.variants) {
        const variantId = (
          await db.productVariant.upsert({
            where: { productId_externalId: { productId, externalId: variant.externalId } },
            create: {
              companyId: product.companyId,
              productId,
              externalId: variant.externalId,
              sku: variant.sku ?? undefined,
              gtin: variant.gtin ?? undefined,
              color: variant.color ?? undefined,
              size: variant.size ?? undefined,
              price: variant.price ?? undefined,
              availableQuantity: variant.availableQuantity,
              attributes: (variant.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
            },
            update: {
              sku: variant.sku ?? undefined,
              gtin: variant.gtin ?? undefined,
              color: variant.color ?? undefined,
              size: variant.size ?? undefined,
              price: variant.price ?? undefined,
              availableQuantity: variant.availableQuantity,
              attributes: (variant.attributes ?? undefined) as Prisma.InputJsonValue | undefined,
            },
            select: { id: true },
          })
        ).id;

        await db.inventory.upsert({
          where: { variantId },
          create: {
            companyId: product.companyId,
            productId,
            variantId,
            available: variant.availableQuantity,
          },
          update: { available: variant.availableQuantity },
        });
      }

      for (const image of product.images) {
        await db.productImage.upsert({
          where: { productId_externalId: { productId, externalId: image.externalId } },
          create: {
            companyId: product.companyId,
            productId,
            externalId: image.externalId,
            url: image.url,
            position: image.position,
          },
          update: { url: image.url, position: image.position },
        });
      }

      return { created: !existing, priceChanged, variantCount: product.variants.length };
    });
  }

  async updateVariantStockAndPrice(input: {
    companyId: string;
    marketplaceAccountId: string;
    externalId: string;
    price: number | null;
    availableQuantity: number;
  }): Promise<{ found: boolean; priceChanged: boolean }> {
    return this.prisma.runInTransaction(async () => {
      const db = this.prisma.db;
      const existing = await db.product.findUnique({
        where: {
          marketplaceAccountId_externalId: {
            marketplaceAccountId: input.marketplaceAccountId,
            externalId: input.externalId,
          },
        },
        select: { id: true, price: true },
      });
      if (!existing) return { found: false, priceChanged: false };

      const oldPrice = existing.price != null ? Number(existing.price) : null;
      const priceChanged = input.price != null && input.price !== oldPrice;

      await db.product.update({
        where: { id: existing.id },
        data: {
          price: input.price ?? undefined,
          availableQuantity: input.availableQuantity,
          lastSyncedAt: new Date(),
        },
      });
      if (priceChanged && input.price != null) {
        await db.productPrice.create({
          data: { companyId: input.companyId, productId: existing.id, amount: input.price },
        });
      }
      return { found: true, priceChanged };
    });
  }

  async upsertCategory(category: NormalizedCategory): Promise<void> {
    const db = this.prisma.db;
    await db.category.upsert({
      where: { externalId: category.externalId },
      create: {
        externalId: category.externalId,
        name: category.name,
        parentExternalId: category.parentExternalId ?? undefined,
        pathFromRoot: category.pathFromRoot as unknown as Prisma.InputJsonValue,
      },
      update: {
        name: category.name,
        parentExternalId: category.parentExternalId ?? undefined,
        pathFromRoot: category.pathFromRoot as unknown as Prisma.InputJsonValue,
      },
    });

    // Closure table: aresta de cada ancestral até esta categoria.
    const path = category.pathFromRoot;
    for (let i = 0; i < path.length; i += 1) {
      const ancestor = path[i];
      const depth = path.length - 1 - i;
      await db.categoryTree.upsert({
        where: {
          ancestorExternalId_childExternalId: {
            ancestorExternalId: ancestor.id,
            childExternalId: category.externalId,
          },
        },
        create: {
          ancestorExternalId: ancestor.id,
          childExternalId: category.externalId,
          depth,
        },
        update: { depth },
      });
    }
  }
}
