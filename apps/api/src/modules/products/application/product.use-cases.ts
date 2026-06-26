import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_EDIT_REPOSITORY,
  ProductEditRepository,
  ProductDetail,
  UpdateProductData,
} from '../domain/ports/product-edit.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

export interface UpdateProductInput {
  internalTitle?: string | null;
  brand?: string | null;
  internalSku?: string | null;
  internalNotes?: string | null;
  promoPrice?: number | null;
  supplierId?: string | null;
}

@Injectable()
export class GetProductUseCase {
  constructor(@Inject(PRODUCT_EDIT_REPOSITORY) private readonly repo: ProductEditRepository) {}
  async execute(id: string): Promise<ProductDetail> {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundError('Produto');
    return product;
  }
}

@Injectable()
export class UpdateProductUseCase {
  constructor(@Inject(PRODUCT_EDIT_REPOSITORY) private readonly repo: ProductEditRepository) {}

  async execute(id: string, input: UpdateProductInput): Promise<void> {
    if (input.promoPrice != null && !(input.promoPrice >= 0)) {
      throw new ValidationError('O preço promocional não pode ser negativo.');
    }
    if (input.supplierId) {
      if (!(await this.repo.supplierExists(input.supplierId))) throw new NotFoundError('Fornecedor');
    }

    const patch: UpdateProductData = {};
    if (input.internalTitle !== undefined) patch.internalTitle = input.internalTitle?.trim() || null;
    if (input.brand !== undefined) patch.brand = input.brand?.trim() || null;
    if (input.internalSku !== undefined) patch.internalSku = input.internalSku?.trim() || null;
    if (input.internalNotes !== undefined) patch.internalNotes = input.internalNotes?.trim() || null;
    if (input.promoPrice !== undefined) patch.promoPrice = input.promoPrice;
    if (input.supplierId !== undefined) patch.supplierId = input.supplierId || null;

    const ok = await this.repo.update(id, patch);
    if (!ok) throw new NotFoundError('Produto');
  }
}
