/**
 * Fetcher de detalhe de produto (Fase 2) — Server Components. Encaminha o access
 * token (cookie httpOnly) para a API NestJS (/products/:id). Sem mocks.
 */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface ProductDetail {
  id: string;
  mlTitle: string;
  internalTitle: string | null;
  effectiveTitle: string;
  brand: string | null;
  mlSku: string | null;
  internalSku: string | null;
  status: string;
  price: number | null;
  promoPrice: number | null;
  effectivePrice: number;
  availableQuantity: number | null;
  supplierId: string | null;
  supplierName: string | null;
  internalNotes: string | null;
}

export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  try {
    const res = await apiFetch(`/products/${id}`, { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as ProductDetail;
  } catch {
    return null;
  }
}
