import { Inject, Injectable } from '@nestjs/common';
import { roiOnCost, roiOnPurchase, prospectiveMarginPct, effectivePrice, effectiveText, isLowProfitability } from '@marketmind/dashboard-core';
import { ROI_REPOSITORY, RoiRepository } from '../domain/ports/roi.repository';

const PRESET_DAYS: Record<string, number> = { '7d': 7, '15d': 15, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };
function daysFromPreset(preset?: string): number {
  return PRESET_DAYS[preset ?? '90d'] ?? 90;
}

export interface ProductRoiRow {
  productId: string;
  sku: string | null;
  title: string;
  revenue: number;
  units: number;
  unitCost: number | null;
  cogs: number;
  profit: number;
  roi: number;
  hasCost: boolean;
  effectivePrice: number;
  prospectiveMargin: number;
}

export interface SupplierRoiRow {
  supplierId: string;
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  purchased: number;
  roi: number;
  productsSold: number;
  lowProfitability: boolean;
}

@Injectable()
export class GetProductRoiUseCase {
  constructor(@Inject(ROI_REPOSITORY) private readonly repo: RoiRepository) {}

  async execute(preset?: string): Promise<ProductRoiRow[]> {
    const raw = await this.repo.productRoi(daysFromPreset(preset));
    return raw.map((r) => {
      const hasCost = r.unitCost != null;
      const unitCost = r.unitCost ?? null;
      const cogs = hasCost ? r.units * (unitCost as number) : 0;
      const profit = r.revenue - cogs;
      const eff = effectivePrice(r.price, r.promoPrice);
      return {
        productId: r.productId,
        sku: r.internalSku?.trim() || r.sku,
        title: effectiveText(r.internalTitle, r.title),
        revenue: r.revenue,
        units: r.units,
        unitCost,
        cogs,
        profit,
        roi: hasCost ? roiOnCost(r.revenue, cogs) : 0,
        hasCost,
        effectivePrice: eff,
        prospectiveMargin: hasCost ? prospectiveMarginPct(eff, unitCost as number) : 0,
      };
    });
  }
}

@Injectable()
export class GetSupplierRoiUseCase {
  constructor(@Inject(ROI_REPOSITORY) private readonly repo: RoiRepository) {}

  async execute(preset?: string): Promise<SupplierRoiRow[]> {
    const raw = await this.repo.supplierRoi(daysFromPreset(preset));
    return raw
      .filter((r) => r.revenue > 0 || r.purchased > 0)
      .map((r) => {
        const profit = r.revenue - r.cogs;
        return {
          supplierId: r.supplierId,
          name: r.name,
          revenue: r.revenue,
          cogs: r.cogs,
          profit,
          purchased: r.purchased,
          roi: roiOnPurchase(profit, r.purchased),
          productsSold: r.productsSold,
          lowProfitability: isLowProfitability(r.revenue, profit),
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }
}
