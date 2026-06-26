'use server';

/**
 * Server Action de import de vendas manuais (Fase 3). Chama a API e redireciona
 * com o resultado para feedback. Revalida os dados afetados (canais + dashboard).
 */
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export async function importManualSalesAction(formData: FormData): Promise<void> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return;
  const csv = String(formData.get('csv') ?? '');
  if (!csv.trim()) return;

  let imported = 0;
  let skipped = 0;
  try {
    const res = await apiFetch('/channels/manual/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}` },
      body: JSON.stringify({ csv }),
    });
    if (res.ok) {
      const data = (await res.json()) as { imported: number; skipped: number };
      imported = data.imported;
      skipped = data.skipped;
    }
  } catch {
    // redireciona sem contagem
  }
  revalidatePath('/dashboard/channels');
  revalidatePath('/dashboard');
  redirect(`/dashboard/channels?imported=${imported}&skipped=${skipped}`);
}
