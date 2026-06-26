/** Helpers visuais compartilhados do backoffice. */

export function money(cents: number, currency = 'BRL'): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });
}

export function date(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '—';
}

const SUB_TONE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  TRIALING: 'bg-amber-100 text-amber-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELED: 'bg-slate-200 text-slate-600',
  INCOMPLETE: 'bg-slate-200 text-slate-600',
};
const SUB_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  TRIALING: 'Em teste',
  PAST_DUE: 'Inadimplente',
  CANCELED: 'Cancelado',
  INCOMPLETE: 'Incompleto',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-xs text-slate-400">sem assinatura</span>;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SUB_TONE[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {SUB_LABEL[status] ?? status}
    </span>
  );
}

const INV_TONE: Record<string, string> = {
  PAID: 'text-emerald-700',
  OPEN: 'text-amber-700',
  FAILED: 'text-red-700',
  VOID: 'text-slate-500',
};
export function InvoiceStatus({ status }: { status: string }) {
  return <span className={`text-xs font-medium ${INV_TONE[status] ?? 'text-slate-600'}`}>{status}</span>;
}
