import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { PRODUCT_EDIT_REPOSITORY } from './domain/ports/product-edit.repository';
import { PrismaProductEditRepository } from './infrastructure/persistence/prisma-product-edit.repository';
import { GetProductUseCase, UpdateProductUseCase } from './application/product.use-cases';
import { ProductsController } from './presentation/http/products.controller';

/**
 * Produtos (Fase 2, Inc.1). Edição manual: marca, SKU/título internos, observações,
 * preço promocional e fornecedor. Overrides internos sync-safe; preço efetivo
 * alimenta os cálculos prospectivos (ROI/margem) no Inc.2.
 */
@Module({
  imports: [IamModule],
  controllers: [ProductsController],
  providers: [
    GetProductUseCase,
    UpdateProductUseCase,
    { provide: PRODUCT_EDIT_REPOSITORY, useClass: PrismaProductEditRepository },
  ],
})
export class ProductsModule {}
