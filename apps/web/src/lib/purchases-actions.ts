'use server';

/**
 * Server Actions de compras (Fase 1). Lêem o cookie httpOnly e chamam a API NestJS
 * (/purchases/*). Receber um pedido altera estoque e custo → revalida estoque/custos.
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

function revalidateAll(): void {
  revalidatePath('/dashboard/purchases');
  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/inventory/reposicao');
  revalidatePath('/dashboard/costs');
  revalidatePath('/dashboard');
}

interface RawItem {
  productId?: string;
  quantity?: number | string;
  unitCost?: number | string;
}

export async function createPurchaseOrderAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const supplierId = String(formData.get('supplierId') ?? '');
  let parsed: RawItem[] = [];
  try {
    parsed = JSON.parse(String(formData.get('itemsJson') ?? '[]')) as RawItem[];
  } catch {
    parsed = [];
  }
  const items = parsed
    .filter((i) => i.productId && Number(i.quantity) > 0)
    .map((i) => ({ productId: String(i.productId), quantity: Number(i.quantity), unitCost: Number(i.unitCost) || 0 }));
  if (!supplierId || items.length === 0) return;

  const expectedAt = String(formData.get('expectedAt') ?? '').trim();
  await apiFetch('/purchases', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({
      supplierId,
      notes: String(formData.get('notes') ?? '').trim() || undefined,
      expectedAt: expectedAt ? new Date(expectedAt).toISOString() : undefined,
      items,
    }),
  });
  revalidatePath('/dashboard/purchases');
}

export async function receivePurchaseOrderAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await apiFetch(`/purchases/${id}/receive`, { method: 'POST', headers: { Authorization: `Bearer ${access}` } });
  revalidateAll();
}

export async function cancelPurchaseOrderAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await apiFetch(`/purchases/${id}/cancel`, { method: 'POST', headers: { Authorization: `Bearer ${access}` } });
  revalidatePath('/dashboard/purchases');
}
