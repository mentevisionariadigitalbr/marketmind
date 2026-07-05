import { getAlerts, type PeriodPreset, type Alert } from '@/lib/dashboard';
import { Card, EmptyState, Badge } from '@/components/dashboard/primitives';
import { PeriodSelector } from '@/components/dashboard/period-selector';

export const dynamic = 'force-dynamic';

const SEVERITY: Record<Alert['severity'], { tone: 'red' | 'amber' | 'blue'; label: string }> = {
  critical: { tone: 'red', label: 'Crítico' },
  warning: { tone: 'amber', label: 'Atenção' },
  info: { tone: 'blue', label: 'Info' },
};

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const sp = await searchParams;
  const preset = (sp.preset ?? '30d') as PeriodPreset;
  const data = await getAlerts(preset);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alertas</h1>
          <p className="text-sm text-slate-500">Ruptura, excesso de estoque, promoção com prejuízo, comprar hoje e variações de vendas</p>
        </div>
        <PeriodSelector basePath="/dashboard/alerts" current={preset} />
      </div>

      {!data || data.alerts.length === 0 ? (
        <EmptyState title="Tudo certo 🎉" description="Nenhum alerta no período selecionado." />
      ) : (
        <>
          <div className="flex gap-2">
            <Badge tone="red">Críticos: {data.counts.critical}</Badge>
            <Badge tone="amber">Atenção: {data.counts.warning}</Badge>
            <Badge tone="blue">Info: {data.counts.info}</Badge>
          </div>
          <Card>
            <ul className="divide-y divide-slate-100">
              {data.alerts.map((a, i) => (
                <li key={`${a.productId}-${a.type}-${i}`} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={SEVERITY[a.severity].tone}>{SEVERITY[a.severity].label}</Badge>
                      <span className="text-sm font-medium text-slate-800">{a.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{a.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{a.sku ?? a.productId.slice(0, 8)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
