import Link from 'next/link';
import { getProductDetail } from '@/lib/products';
import { getSuppliers } from '@/lib/suppliers';
import { updateProductAction } from '@/lib/products-actions';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const field = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';
const label = 'mb-1 block text-xs font-medium text-slate-500';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, suppliers] = await Promise.all([getProductDetail(id), getSuppliers()]);

  if (!product) {
    return <EmptyState title="Produto não encontrado" description="Ele pode ter sido removido ou pertence a outra conta." />;
  }
  const activeSuppliers = (suppliers ?? []).filter((s) => s.active || s.id === product.supplierId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar produto</h1>
          <p className="text-sm text-slate-500">{product.effectiveTitle}</p>
        </div>
        <Link href="/dashboard/products" className="text-sm text-slate-500 hover:underline">
          ← Voltar
        </Link>
      </div>

      <Card title="Referência (Mercado Livre)">
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className={label}>Título ML</dt>
            <dd className="truncate text-slate-700" title={product.mlTitle}>{product.mlTitle}</dd>
          </div>
          <div>
            <dt className={label}>SKU ML</dt>
            <dd className="text-slate-700">{product.mlSku ?? '—'}</dd>
          </div>
          <div>
            <dt className={label}>Preço ML</dt>
            <dd className="text-slate-700">{formatBRL(product.price ?? 0)}</dd>
          </div>
          <div>
            <dt className={label}>Disponível</dt>
            <dd className="text-slate-700">
              {product.availableQuantity ?? 0} <span className="text-xs text-slate-400">(ajuste em Estoque)</span>
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Dados manuais (sobrepõem o ML nos relatórios)">
        <form action={updateProductAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={product.id} />

          <label>
            <span className={label}>Nome interno</span>
            <input name="internalTitle" defaultValue={product.internalTitle ?? ''} placeholder={product.mlTitle} className={field} />
          </label>
          <label>
            <span className={label}>Marca</span>
            <input name="brand" defaultValue={product.brand ?? ''} className={field} />
          </label>
          <label>
            <span className={label}>SKU interno</span>
            <input name="internalSku" defaultValue={product.internalSku ?? ''} placeholder={product.mlSku ?? ''} className={field} />
          </label>
          <label>
            <span className={label}>Fornecedor</span>
            <select name="supplierId" defaultValue={product.supplierId ?? ''} className={field}>
              <option value="">— sem fornecedor —</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Preço promocional (efetivo p/ cálculos)</span>
            <input name="promoPrice" type="number" min={0} step="0.01" defaultValue={product.promoPrice ?? ''} placeholder="vazio = usa o preço cheio" className={field} />
          </label>
          <div className="flex items-end">
            <p className="text-xs text-slate-400">
              Preço efetivo atual: <strong className="text-slate-600">{formatBRL(product.effectivePrice)}</strong>
            </p>
          </div>
          <label className="md:col-span-2">
            <span className={label}>Observações</span>
            <input name="internalNotes" defaultValue={product.internalNotes ?? ''} maxLength={1000} className={field} />
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Salvar alterações
            </button>
            <Link href="/dashboard/products" className="text-sm text-slate-500 hover:underline">Cancelar</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
