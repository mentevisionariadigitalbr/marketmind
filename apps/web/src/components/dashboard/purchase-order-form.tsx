'use client';

import { useState } from 'react';
import { createPurchaseOrderAction } from '@/lib/purchases-actions';

interface SupplierOpt {
  id: string;
  name: string;
}
interface ProductOpt {
  productId: string;
  sku: string | null;
  title: string;
}
interface Item {
  productId: string;
  quantity: number;
  unitCost: number;
}

const field = 'rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';

export function PurchaseOrderForm({
  suppliers,
  products,
  prefill,
}: {
  suppliers: SupplierOpt[];
  products: ProductOpt[];
  prefill?: { productId?: string; quantity?: number; supplierId?: string };
}) {
  const [items, setItems] = useState<Item[]>([
    { productId: prefill?.productId ?? products[0]?.productId ?? '', quantity: prefill?.quantity ?? 1, unitCost: 0 },
  ]);

  if (suppliers.length === 0) {
    return <p className="text-sm text-slate-500">Cadastre um fornecedor antes de criar um pedido de compra.</p>;
  }

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, { productId: products[0]?.productId ?? '', quantity: 1, unitCost: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const total = items.reduce((acc, i) => acc + i.quantity * i.unitCost, 0);

  return (
    <form action={createPurchaseOrderAction} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Fornecedor *</span>
          <select name="supplierId" defaultValue={prefill?.supplierId ?? suppliers[0]?.id} className={field}>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Previsão de entrega</span>
          <input name="expectedAt" type="date" className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">Observações</span>
          <input name="notes" maxLength={1000} className={field} />
        </label>
      </div>

      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid gap-2 md:grid-cols-[3fr_1fr_1fr_auto]">
            <select value={it.productId} onChange={(e) => setItem(idx, { productId: e.target.value })} className={field}>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.sku ? `[${p.sku}] ` : ''}
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              step={1}
              value={it.quantity}
              onChange={(e) => setItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
              className={field}
              placeholder="Qtd"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={it.unitCost}
              onChange={(e) => setItem(idx, { unitCost: Math.max(0, Number(e.target.value)) })}
              className={field}
              placeholder="Custo un."
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="rounded-lg border border-slate-200 px-3 text-slate-500 hover:bg-slate-100"
              aria-label="Remover item"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="text-sm font-medium text-brand hover:underline">
          + Adicionar item
        </button>
      </div>

      <input type="hidden" name="itemsJson" value={JSON.stringify(items)} />

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Total estimado: <strong className="text-slate-800">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </span>
        <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
          Criar pedido
        </button>
      </div>
    </form>
  );
}
