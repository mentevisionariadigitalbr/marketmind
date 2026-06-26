'use server';

/**
 * Server Action de edição manual de produto (Fase 2). Lê o cookie httpOnly e chama
 * PUT /products/:id. Revalida produtos e dashboard (preço efetivo muda cálculos).
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export async function updateProductAction(formData: FormData): Promise<void> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const promoRaw = String(formData.get('promoPrice') ?? '').trim();
  const supplierRaw = String(formData.get('supplierId') ?? '').trim();

  await apiFetch(`/products/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({
      internalTitle: String(formData.get('internalTitle') ?? ''),
      brand: String(formData.get('brand') ?? ''),
      internalSku: String(formData.get('internalSku') ?? ''),
      internalNotes: String(formData.get('internalNotes') ?? ''),
      promoPrice: promoRaw === '' ? null : Number(promoRaw),
      supplierId: supplierRaw === '' ? null : supplierRaw,
    }),
  });

  revalidatePath('/dashboard/products');
  revalidatePath(`/dashboard/products/${id}`);
  revalidatePath('/dashboard');
  redirect('/dashboard/products');
}
