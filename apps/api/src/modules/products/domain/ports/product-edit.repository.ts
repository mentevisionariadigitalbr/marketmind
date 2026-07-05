export const PRODUCT_EDIT_REPOSITORY = Symbol('ProductEditRepository');

export interface ProductDetail {
  id: string;
  /** Título vindo do Mercado Livre (referência). */
  mlTitle: string;
  internalTitle: string | null;
  /** internalTitle quando preenchido; senão mlTitle. */
  effectiveTitle: string;
  brand: string | null;
  mlSku: string | null;
  internalSku: string | null;
  status: string;
  price: number | null;
  promoPrice: number | null;
  /** promoPrice quando válido; senão price. */
  effectivePrice: number;
  availableQuantity: number | null;
  supplierId: string | null;
  supplierName: string | null;
  internalNotes: string | null;
}

export interface UpdateProductData {
  internalTitle?: string | null;
  brand?: string | null;
  internalSku?: string | null;
  internalNotes?: string | null;
  promoPrice?: number | null;
  supplierId?: string | null;
}

/** Edição manual de produto (tenant-scoped via RLS). */
export interface ProductEditRepository {
  findById(id: string): Promise<ProductDetail | null>;
  /** false se o produto não existir (ou for de outra empresa). */
  update(id: string, data: UpdateProductData): Promise<boolean>;
  supplierExists(supplierId: string): Promise<boolean>;
}
