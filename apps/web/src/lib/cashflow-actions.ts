'use server';

/**
 * Server Actions de fluxo de caixa (Fase 3). Lêem o cookie httpOnly e chamam a API
 * NestJS (/cashflow/*). Revalidam a tela de fluxo de caixa.
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function createPayableAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const amount = Number(formData.get('amount'));
  const dueDate = String(formData.get('dueDate') ?? '');
  if (!(amount > 0) || !dueDate) return;
  const supplierId = String(formData.get('supplierId') ?? '').trim();
  await apiFetch('/cashflow/payables', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({
      amount,
      dueDate: new Date(dueDate).toISOString(),
      description: String(formData.get('description') ?? '').trim() || undefined,
      supplierId: supplierId || undefined,
    }),
  });
  revalidatePath('/dashboard/finance/cashflow');
}

export async function payPayableAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await apiFetch(`/cashflow/payables/${id}/pay`, { method: 'POST', headers: { Authorization: `Bearer ${access}` } });
  revalidatePath('/dashboard/finance/cashflow');
}
