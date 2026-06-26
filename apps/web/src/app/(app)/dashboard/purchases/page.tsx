import { getPurchaseOrders, type PurchaseOrderStatus } from '@/lib/purchases';
import { getSuppliers } from '@/lib/suppliers';
import { getCostProducts } from '@/lib/finance';
import { receivePurchaseOrderAction, cancelPurchaseOrderAction } from '@/lib/purchases-actions';
import { Card, EmptyState } from '@/components/dashboard/primitives';
import { PurchaseOrderForm } from '@/components/dashboard/purchase-order-form';
import { formatBRL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUS: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-600' },
  SENT: { label: 'Enviado', cls: 'bg-blue-100 text-blue-700' },
  RECEIVED: { label: 'Recebido', cls: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; quantity?: string; supplierId?: string }>;
}) {
  const sp = await searchParams;
  const [orders, suppliers, productsPage] = await Promise.all([
    getPurchaseOrders(),
    getSuppliers(),
    getCostProducts({ pageSize: 300 }),
  ]);
  const supplierOpts = (suppliers ?? []).filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }));
  const products = (productsPage?.items ?? []).map((p) => ({ productId: p.productId, sku: p.sku, title: p.title }));
  const list = orders ?? [];

  const prefill = sp.productId
    ? { productId: sp.productId, quantity: sp.quantity ? Number(sp.quantity) : 1, supplierId: sp.supplierId }
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
        <p className="text-sm text-slate-500">Pedidos de compra · receber dá entrada no estoque e atualiza o custo médio</p>
      </div>

      <Card title="Novo pedido de compra">
        <PurchaseOrderForm suppliers={supplierOpts} products={products} prefill={prefill} />
      </Card>

      <Card title={`Pedidos (${list.length})`}>
        {list.length === 0 ? (
          <EmptyState title="Nenhum pedido" description="Crie seu primeiro pedido de compra acima." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Criado</th>
                  <th className="py-2 pr-4">Fornecedor</th>
                  <th className="py-2 pr-4 text-right">Itens</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((po) => (
                  <tr key={po.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 tabular-nums text-slate-500">{new Date(po.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2 pr-4">{po.supplierName ?? '—'}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{po.itemsCount}</td>
                    <td className="py-2 pr-4 text-right font-medium tabular-nums">{formatBRL(po.total)}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS[po.status].cls}`}>{STATUS[po.status].label}</span>
                    </td>
                    <td className="py-2 pr-4">
                      {(po.status === 'DRAFT' || po.status === 'SENT') && (
                        <div className="flex justify-end gap-2">
                          <form action={receivePurchaseOrderAction}>
                            <input type="hidden" name="id" value={po.id} />
                            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                              Receber
                            </button>
                          </form>
                          <form action={cancelPurchaseOrderAction}>
                            <input type="hidden" name="id" value={po.id} />
                            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">
                              Cancelar
                            </button>
                          </form>
                        </div>
                      )}
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
