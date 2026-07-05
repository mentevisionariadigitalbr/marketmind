'use client';

import { useRef } from 'react';
import { assignSupplierAction } from '@/lib/suppliers-actions';

interface Opt {
  id: string;
  name: string;
}

/** Select que vincula um produto a um fornecedor; envia ao mudar. */
export function AssignSupplierSelect({
  productId,
  current,
  suppliers,
}: {
  productId: string;
  current: string | null;
  suppliers: Opt[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={assignSupplierAction}>
      <input type="hidden" name="productId" value={productId} />
      <select
        name="supplierId"
        defaultValue={current ?? ''}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
      >
        <option value="">— sem fornecedor —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </form>
  );
}
