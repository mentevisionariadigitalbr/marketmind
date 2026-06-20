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

function revalidateFinance(): void {
  revalidatePath('/dashboard/finance/dre');
  revalidatePath('/dashboard/finance/expenses');
  revalidatePath('/dashboard/finance/taxes');
  revalidatePath('/dashboard');
}

export async function createExpenseAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const startsOn = String(formData.get('startsOn') ?? '');
  if (!startsOn) return;
  const endsOn = String(formData.get('endsOn') ?? '');
  const body = {
    category: String(formData.get('category') ?? ''),
    kind: String(formData.get('kind') ?? 'VARIABLE'),
    amount: Number(formData.get('amount') ?? 0),
    recurrence: String(formData.get('recurrence') ?? 'NONE'),
    startsOn,
    ...(endsOn ? { endsOn } : {}),
    ...(formData.get('note') ? { note: String(formData.get('note')) } : {}),
  };
  await apiFetch('/finance/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify(body),
  });
  revalidateFinance();
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await apiFetch(`/finance/expenses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${access}` } });
  revalidateFinance();
}

export async function upsertTaxRuleAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const category = String(formData.get('category') ?? '');
  const body = {
    regime: String(formData.get('regime') ?? 'SIMPLES_NACIONAL'),
    ...(category ? { category } : {}),
    // usuário digita em %, a API espera fração 0..1.
    rate: Number(formData.get('ratePct') ?? 0) / 100,
    ...(formData.get('note') ? { note: String(formData.get('note')) } : {}),
  };
  await apiFetch('/finance/tax-rules', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify(body),
  });
  revalidateFinance();
}

export async function deleteTaxRuleAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await apiFetch(`/finance/tax-rules/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${access}` } });
  revalidateFinance();
}
