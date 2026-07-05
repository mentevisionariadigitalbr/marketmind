import { Inject, Injectable } from '@nestjs/common';
import { breakEvenPrice, suggestedPrice, realizedMargin, effectivePrice, effectiveText } from '@marketmind/dashboard-core';
import { PRICING_REPOSITORY, PricingRepository } from '../domain/ports/pricing.repository';

/** Comissão padrão do ML quando não há histórico para inferir. */
const DEFAULT_COMMISSION = 0.12;

export interface PricingQuery {
  targetMargin?: number;
  commissionRate?: number;
  taxRate?: number;
  freight?: number;
}

export interface PricingRow {
  productId: string;
  sku: string | null;
  title: string;
  unitCost: number;
  currentPrice: number | null;
  effectivePrice: number;
  realizedMargin: number;
  breakEven: number | null;
  suggested: number | null;
  belowBreakEven: boolean;
}

export interface PricingResult {
  params: { targetMargin: number; commissionRate: number; taxRate: number; freight: number };
  products: PricingRow[];
}

@Injectable()
export class GetPricingUseCase {
  constructor(@Inject(PRICING_REPOSITORY) private readonly repo: PricingRepository) {}

  async execute(query: PricingQuery = {}): Promise<PricingResult> {
    const [raw, defaults] = await Promise.all([this.repo.products(), this.repo.defaults()]);

    const targetMargin = clamp(query.targetMargin ?? 0.3, 0, 0.95);
    const commissionRate =
      query.commissionRate != null ? clamp(query.commissionRate, 0, 1) : defaults.commissionRate > 0 ? defaults.commissionRate : DEFAULT_COMMISSION;
    const taxRate = clamp(query.taxRate ?? 0, 0, 1);
    const freight =
      query.freight != null ? Math.max(query.freight, 0) : defaults.totalUnits > 0 ? round2(defaults.totalFreight / defaults.totalUnits) : 0;

    const products: PricingRow[] = raw.map((r) => {
      const eff = effectivePrice(r.price, r.promoPrice);
      const breakEven = breakEvenPrice(r.unitCost, freight, commissionRate, taxRate);
      return {
        productId: r.productId,
        sku: r.internalSku?.trim() || r.sku,
        title: effectiveText(r.internalTitle, r.title),
        unitCost: r.unitCost,
        currentPrice: r.price,
        effectivePrice: eff,
        realizedMargin: realizedMargin(eff, r.unitCost, freight, commissionRate, taxRate),
        breakEven,
        suggested: suggestedPrice(r.unitCost, freight, commissionRate, taxRate, targetMargin),
        belowBreakEven: breakEven != null && eff > 0 && eff < breakEven,
      };
    });
    products.sort((a, b) => a.realizedMargin - b.realizedMargin);

    return { params: { targetMargin, commissionRate, taxRate, freight }, products };
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
