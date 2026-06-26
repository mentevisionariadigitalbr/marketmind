export const SUPPLIER_REPOSITORY = Symbol('SupplierRepository');

export interface SupplierData {
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  document: string | null;
  leadTimeDays: number | null;
  paymentTermDays: number | null;
  notes: string | null;
  active: boolean;
}

export interface Supplier extends SupplierData {
  id: string;
}

export interface ProductSupplierRow {
  productId: string;
  sku: string | null;
  title: string;
  supplierId: string | null;
  supplierName: string | null;
}

/** Fornecedores (tenant-scoped via RLS). */
export interface SupplierRepository {
  create(data: SupplierData): Promise<string>;
  /** Atualização parcial. false se o fornecedor não existir (ou for de outra empresa). */
  update(id: string, data: Partial<SupplierData>): Promise<boolean>;
  findById(id: string): Promise<Supplier | null>;
  list(): Promise<Supplier[]>;
  /** Vincula/desvincula um produto a um fornecedor. false se o produto não existir. */
  setProductSupplier(productId: string, supplierId: string | null): Promise<boolean>;
  listProductsWithSupplier(): Promise<ProductSupplierRow[]>;
}
