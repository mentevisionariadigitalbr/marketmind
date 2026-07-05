import { Inject, Injectable } from '@nestjs/common';
import { roiOnPurchase, effectiveText } from '@marketmind/dashboard-core';
import { SUPPLIER_REPOSITORY, SupplierRepository } from '../domain/ports/supplier.repository';
import { SUPPLIER_REPORT_REPOSITORY, SupplierReportRepository } from '../domain/ports/supplier-report.repository';
import { NotFoundError } from '../../iam/application/errors';

const PRESET_DAYS: Record<string, number> = { '7d': 7, '15d': 15, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };

export interface SupplierReportProduct {
  productId: string;
  sku: string | null;
  title: string;
  available: number;
  unitsSold: number;
  revenue: number;
  unitCost: number | null;
  cogs: number;
  profit: number;
  marginPct: number;
  hasCost: boolean;
  stockValueAtCost: number;
}

export interface SupplierReport {
  supplier: { id: string; name: string; leadTimeDays: number | null };
  totals: {
    revenue: number;
    cogs: number;
    profit: number;
    purchased: number;
    roi: number;
    unitsSold: number;
    productsCount: number;
    stockUnits: number;
    stockValueAtCost: number;
  };
  products: SupplierReportProduct[];
}

@Injectable()
export class GetSupplierReportUseCase {
  constructor(
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(SUPPLIER_REPORT_REPOSITORY) private readonly report: SupplierReportRepository,
  ) {}

  async execute(supplierId: string, preset?: string): Promise<SupplierReport> {
    const supplier = await this.suppliers.findById(supplierId);
    if (!supplier) throw new NotFoundError('Fornecedor');

    const days = PRESET_DAYS[preset ?? '90d'] ?? 90;
    const [raw, purchased] = await Promise.all([
      this.report.products(supplierId, days),
      this.report.purchased(supplierId, days),
    ]);

    const products: SupplierReportProduct[] = raw.map((r) => {
      const hasCost = r.unitCost != null;
      const unitCost = r.unitCost ?? null;
      const cogs = hasCost ? r.unitsSold * (unitCost as number) : 0;
      const profit = r.revenue - cogs;
      return {
        productId: r.productId,
        sku: r.internalSku?.trim() || r.sku,
        title: effectiveText(r.internalTitle, r.title),
        available: r.available,
        unitsSold: r.unitsSold,
        revenue: r.revenue,
        unitCost,
        cogs,
        profit,
        marginPct: r.revenue > 0 ? profit / r.revenue : 0,
        hasCost,
        stockValueAtCost: hasCost ? r.available * (unitCost as number) : 0,
      };
    });

    const sum = (pick: (p: SupplierReportProduct) => number) => products.reduce((acc, p) => acc + pick(p), 0);
    const revenue = sum((p) => p.revenue);
    const cogs = sum((p) => p.cogs);
    const profit = revenue - cogs;

    return {
      supplier: { id: supplier.id, name: supplier.name, leadTimeDays: supplier.leadTimeDays },
      totals: {
        revenue,
        cogs,
        profit,
        purchased,
        roi: roiOnPurchase(profit, purchased),
        unitsSold: sum((p) => p.unitsSold),
        productsCount: products.length,
        stockUnits: sum((p) => p.available),
        stockValueAtCost: sum((p) => p.stockValueAtCost),
      },
      products,
    };
  }
}
