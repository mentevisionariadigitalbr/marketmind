'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { adjustStockAction, inventoryCountAction } from '@/lib/inventory-actions';

interface ProductOpt {
  productId: string;
  sku: string | null;
  title: string;
}

const tab = (active: boolean) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;
const field = 'rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';

/** Registrar ajuste (+/−) ou inventário (contagem física). Navega por ?product= para mostrar o histórico. */
export function StockMovementForm({ products, selected }: { products: ProductOpt[]; selected?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<'adjust' | 'count'>('adjust');
  const productId = selected ?? products[0]?.productId ?? '';

  function selectProduct(id: string) {
    const preset = search.get('preset');
    router.push(`/dashboard/inventory?product=${id}${preset ? `&preset=${preset}` : ''}`);
  }

  if (products.length === 0) {
    return <p className="text-sm text-slate-500">Sincronize o catálogo para registrar movimentações.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" className={tab(mode === 'adjust')} onClick={() => setMode('adjust')}>
          Ajuste (+/−)
        </button>
        <button type="button" className={tab(mode === 'count')} onClick={() => setMode('count')}>
          Inventário (contagem)
        </button>
      </div>

      <form action={mode === 'adjust' ? adjustStockAction : inventoryCountAction} className="grid gap-3 md:grid-cols-[2fr_1fr_2fr_auto]">
        <select
          name="productId"
          defaultValue={productId}
          onChange={(e) => selectProduct(e.target.value)}
          className={field}
        >
          {products.map((p) => (
            <option key={p.productId} value={p.productId}>
              {p.sku ? `[${p.sku}] ` : ''}
              {p.title}
            </option>
          ))}
        </select>

        {mode === 'adjust' ? (
          <input name="quantity" type="number" step="1" placeholder="Qtd (+/−)" required className={field} />
        ) : (
          <input name="countedQuantity" type="number" step="1" min={0} placeholder="Contagem física" required className={field} />
        )}

        <input name="reason" type="text" maxLength={280} placeholder="Motivo (opcional)" className={field} />
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Registrar
        </button>
      </form>

      <p className="text-xs text-slate-400">
        {mode === 'adjust'
          ? 'Ajuste soma/subtrai do saldo do razão (ex.: −2 quebra, +5 sobra).'
          : 'Inventário define a quantidade física contada; o sistema registra a diferença.'}
      </p>
    </div>
  );
}
