import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import { effectivePrice, effectiveText } from '@marketmind/dashboard-core';
import {
  ProductDetail,
  ProductEditRepository,
  UpdateProductData,
} from '../../domain/ports/product-edit.repository';

@Injectable()
export class PrismaProductEditRepository implements ProductEditRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async findById(id: string): Promise<ProductDetail | null> {
    return this.prisma.runInTransaction(async () => {
      const p = await this.prisma.db.product.findFirst({
        where: { id, companyId: this.companyId },
        select: {
          id: true,
          title: true,
          internalTitle: true,
          brand: true,
          sku: true,
          internalSku: true,
          status: true,
          price: true,
          promoPrice: true,
          availableQuantity: true,
          supplierId: true,
          internalNotes: true,
          supplier: { select: { name: true } },
        },
      });
      if (!p) return null;
      const price = p.price != null ? Number(p.price) : null;
      const promoPrice = p.promoPrice != null ? Number(p.promoPrice) : null;
      return {
        id: p.id,
        mlTitle: p.title,
        internalTitle: p.internalTitle,
        effectiveTitle: effectiveText(p.internalTitle, p.title),
        brand: p.brand,
        mlSku: p.sku,
        internalSku: p.internalSku,
        status: p.status,
        price,
        promoPrice,
        effectivePrice: effectivePrice(price, promoPrice),
        availableQuantity: p.availableQuantity,
        supplierId: p.supplierId,
        supplierName: p.supplier?.name ?? null,
        internalNotes: p.internalNotes,
      };
    });
  }

  async update(id: string, data: UpdateProductData): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const res = await this.prisma.db.product.updateMany({
        where: { id, companyId: this.companyId },
        data: {
          internalTitle: data.internalTitle,
          brand: data.brand,
          internalSku: data.internalSku,
          internalNotes: data.internalNotes,
          promoPrice: data.promoPrice != null ? new Prisma.Decimal(data.promoPrice) : data.promoPrice,
          supplierId: data.supplierId,
        },
      });
      return res.count > 0;
    });
  }

  async supplierExists(supplierId: string): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const s = await this.prisma.db.supplier.findFirst({ where: { id: supplierId, companyId: this.companyId }, select: { id: true } });
      return !!s;
    });
  }
}
