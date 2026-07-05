import { getSubscription } from '@/lib/reports';
import { saveSubscriptionAction, sendDigestNowAction } from '@/lib/reports-actions';
import { Card } from '@/components/dashboard/primitives';

export const dynamic = 'force-dynamic';

const field = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none';

export default async function ReportsSettingsPage() {
  const sub = await getSubscription();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Relatórios por e-mail</h1>
        <p className="text-sm text-slate-500">Receba um resumo de vendas, estoque e contas a pagar no seu e-mail</p>
      </div>

      <Card title="Configuração">
        <form action={saveSubscriptionAction} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Destinatários (separados por vírgula)</span>
            <input name="recipients" defaultValue={sub?.recipients ?? ''} placeholder="voce@empresa.com, socio@empresa.com" className={field} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Frequência</span>
              <select name="frequency" defaultValue={sub?.frequency ?? 'WEEKLY'} className={field}>
                <option value="DAILY">Diário</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </label>
            <label className="flex items-end gap-2 text-sm text-slate-600">
              <input type="checkbox" name="enabled" defaultChecked={sub?.enabled ?? false} /> Ativar envio automático
            </label>
          </div>
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            Salvar
          </button>
        </form>
      </Card>

      <Card title="Enviar agora">
        <p className="mb-3 text-sm text-slate-500">Envia o resumo imediatamente para os destinatários configurados (ótimo para testar).</p>
        <form action={sendDigestNowAction}>
          <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Enviar resumo de teste
          </button>
        </form>
        {sub?.lastSentAt && (
          <p className="mt-3 text-xs text-slate-400">Último envio: {new Date(sub.lastSentAt).toLocaleString('pt-BR')}</p>
        )}
      </Card>
    </div>
  );
}
