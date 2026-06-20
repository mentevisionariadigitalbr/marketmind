'use server';

/**
 * Server Actions de escrita de custos (Fase 1). Lêem o cookie httpOnly e chamam
 * a API NestJS (/costs/*). Revalidam o dashboard para refletir lucro/cobertura.
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function upsertCostAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const productId = String(formData.get('productId') ?? '');
  if (!productId) return;
  const body = {
    acquisitionCost: Number(formData.get('acquisitionCost') ?? 0),
    inboundFreight: Number(formData.get('inboundFreight') ?? 0),
    packagingCost: Number(formData.get('packagingCost') ?? 0),
    otherCost: Number(formData.get('otherCost') ?? 0),
  };
  await apiFetch(`/costs/products/${productId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify(body),
  });
  revalidatePath('/dashboard/costs');
  revalidatePath('/dashboard');
}

export async function importCostsAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const csv = String(formData.get('csv') ?? '');
  if (!csv.trim()) return;
  await apiFetch('/costs/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({ csv }),
  });
  revalidatePath('/dashboard/costs');
  revalidatePath('/dashboard');
}
