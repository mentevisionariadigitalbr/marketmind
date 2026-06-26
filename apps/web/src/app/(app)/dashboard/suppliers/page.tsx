import Link from 'next/link';
import { getSuppliers, getProductSuppliers } from '@/lib/suppliers';
import { createSupplierAction, updateSupplierAction } from '@/lib/suppliers-actions';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { AssignSupplierSelect } from '@/components/dashboard/assign-supplier-select';

export const dynamic = 'force-dynamic';

const field = 'rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';
const label = 'text-xs font-medium text-slate-500';

export default async function SuppliersPage() {
  const [suppliers, products] = await Promise.all([getSuppliers(), getProductSuppliers()]);
  const list = suppliers ?? [];
  const supplierOpts = list.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
        <p className="text-sm text-slate-500">Cadastro, prazo de entrega (lead time) e vínculo com produtos</p>
      </div>

      <Card title="Novo fornecedor">
        <form action={createSupplierAction} className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className={label}>Nome *</span>
            <input name="name" required maxLength={160} className={field} placeholder="Distribuidora X" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Contato</span>
            <input name="contactName" maxLength={160} className={field} placeholder="João" />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>Telefone</span>
            <input name="phone" maxLength={40} className={field} placeholder="(11) 9..." />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>E-mail</span>
            <input name="email" type="email" className={field} placeholder="contato@..." />
          </label>
          <label className="flex flex-col gap-1">
            <span className={label}>CNPJ/Documento</span>
            <input name="document" maxLength={40} className={field} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={label}>Lead time (dias)</span>
              <input name="leadTimeDays" type="number" min={0} step={1} className={field} placeholder="7" />
            </label>
            <label className="flex flex-col gap-1">
              <span className={label}>Prazo pgto (dias)</span>
              <input name="paymentTermDays" type="number" min={0} step={1} className={field} placeholder="30" />
            </label>
          </div>
          <label className="flex flex-col gap-1 md:col-span-3">
            <span className={label}>Observações</span>
            <input name="notes" maxLength={1000} className={field} />
          </label>
          <div className="md:col-span-3">
            <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Adicionar fornecedor
            </button>
          </div>
        </form>
      </Card>

      <Card title={`Fornecedores (${list.length})`}>
        {list.length === 0 ? (
          <EmptyState title="Nenhum fornecedor" description="Cadastre seu primeiro fornecedor acima." />
        ) : (
          <div className="space-y-2">
            {list.map((s) => (
              <details key={s.id} className="rounded-lg border border-slate-200">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium text-slate-800">
                    {s.name}
                    {!s.active && <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">inativo</span>}
                  </span>
                  <span className="flex items-center gap-3 text-slate-500">
                    <span>{s.leadTimeDays != null ? `${s.leadTimeDays}d entrega` : 'sem lead time'} · {s.contactName ?? '—'}</span>
                    <Link href={`/dashboard/suppliers/${s.id}/report`} className="text-xs font-medium text-brand hover:underline">
                      Relatório
                    </Link>
                  </span>
                </summary>
                <form action={updateSupplierAction} className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-3">
                  <input type="hidden" name="id" value={s.id} />
                  <label className="flex flex-col gap-1">
                    <span className={label}>Nome</span>
                    <input name="name" defaultValue={s.name} className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={label}>Contato</span>
                    <input name="contactName" defaultValue={s.contactName ?? ''} className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={label}>Telefone</span>
                    <input name="phone" defaultValue={s.phone ?? ''} className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={label}>E-mail</span>
                    <input name="email" defaultValue={s.email ?? ''} className={field} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={label}>CNPJ/Documento</span>
                    <input name="document" defaultValue={s.document ?? ''} className={field} />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className={label}>Lead time (dias)</span>
                      <input name="leadTimeDays" type="number" min={0} defaultValue={s.leadTimeDays ?? ''} className={field} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={label}>Prazo pgto (dias)</span>
                      <input name="paymentTermDays" type="number" min={0} defaultValue={s.paymentTermDays ?? ''} className={field} />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span className={label}>Observações</span>
                    <input name="notes" defaultValue={s.notes ?? ''} className={field} />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" name="active" defaultChecked={s.active} /> Ativo
                  </label>
                  <div className="md:col-span-3">
                    <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                      Salvar
                    </button>
                  </div>
                </form>
              </details>
            ))}
          </div>
        )}
      </Card>

      <Card title="Vincular produtos a fornecedores">
        {!products || products.length === 0 ? (
          <p className="text-sm text-slate-500">Sincronize o catálogo para vincular produtos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Produto</th>
                  <th className="py-2 pr-4">Fornecedor</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.productId} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-500">{p.sku ?? '—'}</td>
                    <td className="py-2 pr-4">{p.title}</td>
                    <td className="py-2 pr-4">
                      <AssignSupplierSelect productId={p.productId} current={p.supplierId} suppliers={supplierOpts} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
