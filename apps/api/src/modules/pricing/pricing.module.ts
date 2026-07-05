import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { PRICING_REPOSITORY } from './domain/ports/pricing.repository';
import { PrismaPricingRepository } from './infrastructure/persistence/prisma-pricing.repository';
import { GetPricingUseCase } from './application/pricing.use-cases';
import { PricingController } from './presentation/http/pricing.controller';

/**
 * Precificação (Fase 3, Inc.2). Preço sugerido (margem-alvo) e preço mínimo
 * (break-even) a partir de custo + comissão + frete + imposto.
 */
@Module({
  imports: [IamModule],
  controllers: [PricingController],
  providers: [GetPricingUseCase, { provide: PRICING_REPOSITORY, useClass: PrismaPricingRepository }],
})
export class PricingModule {}
