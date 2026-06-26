import { Inject, Injectable } from '@nestjs/common';
import {
  SUPPLIER_REPOSITORY,
  SupplierRepository,
  SupplierData,
  Supplier,
  ProductSupplierRow,
} from '../domain/ports/supplier.repository';
import { NotFoundError, ValidationError } from '../../iam/application/errors';

export interface SupplierInput {
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  leadTimeDays?: number | null;
  paymentTermDays?: number | null;
  notes?: string | null;
  active?: boolean;
}

function validateDays(value: number | null | undefined, label: string): void {
  if (value === null || value === undefined) return;
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${label} deve ser um inteiro maior ou igual a zero.`);
  }
}

@Injectable()
export class CreateSupplierUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repo: SupplierRepository) {}

  async execute(input: SupplierInput): Promise<{ id: string }> {
    const name = input.name?.trim();
    if (!name) throw new ValidationError('O nome do fornecedor é obrigatório.');
    validateDays(input.leadTimeDays, 'O prazo de entrega');
    validateDays(input.paymentTermDays, 'O prazo de pagamento');

    const data: SupplierData = {
      name,
      contactName: input.contactName?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      document: input.document?.trim() || null,
      leadTimeDays: input.leadTimeDays ?? null,
      paymentTermDays: input.paymentTermDays ?? null,
      notes: input.notes?.trim() || null,
      active: input.active ?? true,
    };
    const id = await this.repo.create(data);
    return { id };
  }
}

@Injectable()
export class UpdateSupplierUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repo: SupplierRepository) {}

  async execute(id: string, input: SupplierInput): Promise<void> {
    if (input.name !== undefined && !input.name.trim()) {
      throw new ValidationError('O nome do fornecedor não pode ficar vazio.');
    }
    validateDays(input.leadTimeDays, 'O prazo de entrega');
    validateDays(input.paymentTermDays, 'O prazo de pagamento');

    const patch: Partial<SupplierData> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.contactName !== undefined) patch.contactName = input.contactName?.trim() || null;
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
    if (input.email !== undefined) patch.email = input.email?.trim() || null;
    if (input.document !== undefined) patch.document = input.document?.trim() || null;
    if (input.leadTimeDays !== undefined) patch.leadTimeDays = input.leadTimeDays;
    if (input.paymentTermDays !== undefined) patch.paymentTermDays = input.paymentTermDays;
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
    if (input.active !== undefined) patch.active = input.active;

    const ok = await this.repo.update(id, patch);
    if (!ok) throw new NotFoundError('Fornecedor');
  }
}

@Injectable()
export class ListSuppliersUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repo: SupplierRepository) {}
  execute(): Promise<Supplier[]> {
    return this.repo.list();
  }
}

@Injectable()
export class GetSupplierUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repo: SupplierRepository) {}
  async execute(id: string): Promise<Supplier> {
    const supplier = await this.repo.findById(id);
    if (!supplier) throw new NotFoundError('Fornecedor');
    return supplier;
  }
}

@Injectable()
export class AssignProductSupplierUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repo: SupplierRepository) {}

  async execute(productId: string, supplierId: string | null): Promise<void> {
    if (supplierId) {
      const supplier = await this.repo.findById(supplierId);
      if (!supplier) throw new NotFoundError('Fornecedor');
    }
    const ok = await this.repo.setProductSupplier(productId, supplierId);
    if (!ok) throw new NotFoundError('Produto');
  }
}

@Injectable()
export class ListProductSuppliersUseCase {
  constructor(@Inject(SUPPLIER_REPOSITORY) private readonly repo: SupplierRepository) {}
  execute(): Promise<ProductSupplierRow[]> {
    return this.repo.listProductsWithSupplier();
  }
}
