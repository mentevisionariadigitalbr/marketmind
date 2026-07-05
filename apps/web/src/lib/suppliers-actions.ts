'use server';

/**
 * Server Actions de fornecedores (Fase 1). Lêem o cookie httpOnly e chamam a API
 * NestJS (/suppliers/*). Revalidam a tela de fornecedores.
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

async function token(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

function num(form: FormData, key: string): number | undefined {
  const raw = form.get(key);
  if (raw === null || String(raw).trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function str(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  const v = raw === null ? '' : String(raw).trim();
  return v === '' ? undefined : v;
}

export async function createSupplierAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const name = str(formData, 'name');
  if (!name) return;
  await apiFetch('/suppliers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({
      name,
      contactName: str(formData, 'contactName'),
      phone: str(formData, 'phone'),
      email: str(formData, 'email'),
      document: str(formData, 'document'),
      leadTimeDays: num(formData, 'leadTimeDays'),
      paymentTermDays: num(formData, 'paymentTermDays'),
      notes: str(formData, 'notes'),
    }),
  });
  revalidatePath('/dashboard/suppliers');
}

export async function updateSupplierAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const id = str(formData, 'id');
  if (!id) return;
  await apiFetch(`/suppliers/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({
      name: str(formData, 'name'),
      contactName: str(formData, 'contactName'),
      phone: str(formData, 'phone'),
      email: str(formData, 'email'),
      document: str(formData, 'document'),
      leadTimeDays: num(formData, 'leadTimeDays'),
      paymentTermDays: num(formData, 'paymentTermDays'),
      notes: str(formData, 'notes'),
      active: formData.get('active') === 'on' || formData.get('active') === 'true',
    }),
  });
  revalidatePath('/dashboard/suppliers');
}

export async function assignSupplierAction(formData: FormData): Promise<void> {
  const access = await token();
  if (!access) return;
  const productId = str(formData, 'productId');
  if (!productId) return;
  const supplierId = str(formData, 'supplierId') ?? null;
  await apiFetch(`/suppliers/products/${productId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${access}` },
    body: JSON.stringify({ supplierId }),
  });
  revalidatePath('/dashboard/suppliers');
}
