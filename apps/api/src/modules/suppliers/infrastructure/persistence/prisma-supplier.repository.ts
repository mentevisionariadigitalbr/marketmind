import { Injectable } from '@nestjs/common';
import { PrismaService, requireTenant } from '@marketmind/kernel';
import {
  ProductSupplierRow,
  Supplier,
  SupplierData,
  SupplierRepository,
} from '../../domain/ports/supplier.repository';

@Injectable()
export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get companyId(): string {
    return requireTenant().companyId;
  }

  async create(data: SupplierData): Promise<string> {
    return this.prisma.runInTransaction(async () => {
      const created = await this.prisma.db.supplier.create({
        data: { companyId: this.companyId, ...data },
        select: { id: true },
      });
      return created.id;
    });
  }

  async update(id: string, data: Partial<SupplierData>): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const res = await this.prisma.db.supplier.updateMany({
        where: { id, companyId: this.companyId },
        data,
      });
      return res.count > 0;
    });
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.prisma.runInTransaction(async () => {
      const s = await this.prisma.db.supplier.findFirst({ where: { id, companyId: this.companyId } });
      return s ? this.toSupplier(s) : null;
    });
  }

  async list(): Promise<Supplier[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.supplier.findMany({
        where: { companyId: this.companyId },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      });
      return rows.map((s) => this.toSupplier(s));
    });
  }

  async setProductSupplier(productId: string, supplierId: string | null): Promise<boolean> {
    return this.prisma.runInTransaction(async () => {
      const res = await this.prisma.db.product.updateMany({
        where: { id: productId, companyId: this.companyId },
        data: { supplierId },
      });
      return res.count > 0;
    });
  }

  async listProductsWithSupplier(): Promise<ProductSupplierRow[]> {
    return this.prisma.runInTransaction(async () => {
      const rows = await this.prisma.db.product.findMany({
        where: { companyId: this.companyId },
        orderBy: { title: 'asc' },
        select: { id: true, sku: true, title: true, supplierId: true, supplier: { select: { name: true } } },
      });
      return rows.map((p) => ({
        productId: p.id,
        sku: p.sku,
        title: p.title,
        supplierId: p.supplierId,
        supplierName: p.supplier?.name ?? null,
      }));
    });
  }

  private toSupplier(s: {
    id: string;
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    document: string | null;
    leadTimeDays: number | null;
    paymentTermDays: number | null;
    notes: string | null;
    active: boolean;
  }): Supplier {
    return {
      id: s.id,
      name: s.name,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      document: s.document,
      leadTimeDays: s.leadTimeDays,
      paymentTermDays: s.paymentTermDays,
      notes: s.notes,
      active: s.active,
    };
  }
}
