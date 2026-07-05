/**
 * Lógica pura do digest por e-mail (Fase 3, Inc.3): regra de vencimento e a
 * composição do conteúdo. Sem I/O — a infra só alimenta os números e envia.
 */

export type ReportFrequency = 'DAILY' | 'WEEKLY';

export interface DigestData {
  companyName: string;
  revenue7d: number;
  orders7d: number;
  units7d: number;
  outOfStock: number;
  lowStock: number;
  payablesPending: number;
  payablesOverdue: number;
}

const HOURS = 3_600_000;

/** Está na hora de enviar? DAILY: ≥ 23h; WEEKLY: ≥ 6d23h. Nunca enviado → sim. */
export function isDigestDue(frequency: ReportFrequency, lastSentAt: Date | null, now: Date): boolean {
  if (!lastSentAt) return true;
  const elapsedH = (now.getTime() - lastSentAt.getTime()) / HOURS;
  return frequency === 'DAILY' ? elapsedH >= 23 : elapsedH >= 167;
}

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface DigestEmail {
  subject: string;
  html: string;
  text: string;
}

/** Monta assunto + corpo (HTML e texto) do digest a partir dos números. */
export function composeDigest(frequency: ReportFrequency, data: DigestData): DigestEmail {
  const period = frequency === 'DAILY' ? 'do dia' : 'da semana';
  const subject = `MarketMind — Resumo ${frequency === 'DAILY' ? 'diário' : 'semanal'}: ${brl(data.revenue7d)} em vendas (7d)`;

  const rows: [string, string][] = [
    ['Receita (7 dias)', brl(data.revenue7d)],
    ['Pedidos (7 dias)', String(data.orders7d)],
    ['Unidades vendidas', String(data.units7d)],
    ['Itens sem estoque', String(data.outOfStock)],
    ['Itens com estoque baixo', String(data.lowStock)],
    ['Contas a pagar (pendente)', brl(data.payablesPending)],
    ['Contas a pagar (vencido)', brl(data.payablesOverdue)],
  ];

  const htmlRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#475569">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#0f172a">${v}</td></tr>`,
    )
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#0f172a">Resumo ${period} — ${data.companyName}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${htmlRows}</table>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px">Enviado pelo MarketMind AI · acesse o painel para detalhes.</p>
  </div>`;

  const text = `Resumo ${period} — ${data.companyName}\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { subject, html, text };
}
