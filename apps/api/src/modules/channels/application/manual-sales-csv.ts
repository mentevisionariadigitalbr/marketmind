/**
 * Parser puro do CSV de vendas manuais (Fase 3, Inc.4). Sem I/O.
 * Formato: data, sku, quantidade, preço unitário [, comissão, frete, referência]
 * Separador ';' (Excel pt-BR, decimal com vírgula) ou ',' (decimal com ponto).
 */

export interface ParsedSale {
  externalId: string;
  date: string; // ISO yyyy-mm-dd
  sku: string;
  quantity: number;
  unitPrice: number;
  commission: number;
  freight: number;
  gross: number;
}

export interface ParseResult {
  rows: ParsedSale[];
  errors: string[];
}

function parseNum(s: string): number {
  const t = (s ?? '').trim().replace(/\s/g, '');
  const norm = t.includes(',') && !t.includes('.') ? t.replace(',', '.') : t;
  return Number(norm);
}

function parseDate(s: string): string | null {
  const t = (s ?? '').trim();
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return null;
}

export function parseManualSalesCsv(csv: string): ParseResult {
  const rows: ParsedSale[] = [];
  const errors: string[] = [];
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  lines.forEach((line, idx) => {
    const sep = line.includes(';') ? ';' : ',';
    const cells = line.split(sep).map((c) => c.trim());
    // Cabeçalho (primeira linha sem data válida na coluna 1).
    if (idx === 0 && parseDate(cells[0]) === null) return;

    const lineNo = idx + 1;
    if (cells.length < 4) {
      errors.push(`Linha ${lineNo}: colunas insuficientes (esperado data, sku, qtd, preço).`);
      return;
    }
    const date = parseDate(cells[0]);
    if (!date) {
      errors.push(`Linha ${lineNo}: data inválida "${cells[0]}".`);
      return;
    }
    const sku = cells[1];
    if (!sku) {
      errors.push(`Linha ${lineNo}: SKU vazio.`);
      return;
    }
    const quantity = parseNum(cells[2]);
    const unitPrice = parseNum(cells[3]);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push(`Linha ${lineNo}: quantidade inválida "${cells[2]}".`);
      return;
    }
    if (!(unitPrice >= 0)) {
      errors.push(`Linha ${lineNo}: preço inválido "${cells[3]}".`);
      return;
    }
    const commission = cells[4] ? Math.max(parseNum(cells[4]) || 0, 0) : 0;
    const freight = cells[5] ? Math.max(parseNum(cells[5]) || 0, 0) : 0;
    const reference = cells[6]?.trim() ?? '';

    rows.push({
      externalId: `manual:${date}:${sku}:${quantity}:${unitPrice}:${reference}`,
      date,
      sku,
      quantity,
      unitPrice,
      commission,
      freight,
      gross: Math.round(quantity * unitPrice * 100) / 100,
    });
  });

  return { rows, errors };
}
