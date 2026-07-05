import { getMarketplaceAccounts, type AccountStatus } from '@/lib/integrations';
import { connectMlAction, syncOrdersAction } from '@/lib/integrations-actions';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';

export const dynamic = 'force-dynamic';

const STATUS: Record<AccountStatus, { tone: 'green' | 'amber' | 'red' | 'slate'; label: string }> = {
  CONNECTED: { tone: 'green', label: 'Conectado' },
  EXPIRED: { tone: 'amber', label: 'Token expirado — reconecte' },
  ERROR: { tone: 'red', label: 'Erro' },
  DISCONNECTED: { tone: 'slate', label: 'Desconectado' },
};

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const sp = await searchParams;
  const accounts = await getMarketplaceAccounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Integrações</h1>
        <p className="text-sm text-slate-500">Conecte seu marketplace para sincronizar pedidos e catálogo.</p>
      </div>

      {sp.connected && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Conta conectada com sucesso. Clique em “Sincronizar agora” para importar seus pedidos.
        </div>
      )}
      {sp.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Não foi possível concluir a conexão. Tente novamente.
        </div>
      )}

      <Card title="Mercado Livre">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Autorize o MarketMind a acessar sua conta de vendedor.</p>
          <form action={connectMlAction}>
            <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Conectar Mercado Livre
            </button>
          </form>
        </div>
      </Card>

      <Card title="Contas conectadas">
        {!accounts || accounts.length === 0 ? (
          <EmptyState title="Nenhuma conta conectada" description="Use o botão acima para conectar sua primeira conta." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{a.marketplace}</span>
                    <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {a.nickname ?? a.externalUserId}
                    {a.lastSyncedAt ? ` · última sync ${a.lastSyncedAt.slice(0, 10)}` : ' · nunca sincronizada'}
                  </p>
                </div>
                <form action={syncOrdersAction}>
                  <input type="hidden" name="accountId" value={a.id} />
                  <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Sincronizar agora
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
