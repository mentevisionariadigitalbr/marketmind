'use server';

/**
 * Server Actions de estoque operacional (Fase 1). Lêem o cookie httpOnly e chamam
 * a API NestJS (/inventory/*). Revalidam a tela de estoque para refletir o razão.
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function adjustStockAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const productId = String(formData.get('productId') ?? '');
  const quantity = Number(formData.get('quantity') ?? 0);
  if (!productId || !Number.isInteger(quantity) || quantity === 0) return;
  await apiFetch('/inventory/adjustments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({ productId, quantity, reason: String(formData.get('reason') ?? '') || undefined }),
  });
  revalidatePath('/dashboard/inventory');
}

export async function inventoryCountAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const productId = String(formData.get('productId') ?? '');
  const countedQuantity = Number(formData.get('countedQuantity') ?? -1);
  if (!productId || !Number.isInteger(countedQuantity) || countedQuantity < 0) return;
  await apiFetch('/inventory/inventory-counts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({ productId, countedQuantity, reason: String(formData.get('reason') ?? '') || undefined }),
  });
  revalidatePath('/dashboard/inventory');
}
