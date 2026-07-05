/**
 * Parser puro de CSV de custos (Fase 1). Cabeçalho por nome (tolerante a
 * variações pt/en). Aceita vírgula decimal. Linhas sem SKU são ignoradas.
 * Função pura → testável isoladamente.
 */
export interface CostCsvRow {
  readonly sku: string;
  readonly acquisitionCost: number;
  readonly inboundFreight: number;
  readonly packagingCost: number;
  readonly otherCost: number;
}

const COLS = {
  sku: ['sku'],
  acquisition: ['acquisition_cost', 'acquisitioncost', 'custo', 'cost', 'aquisicao'],
  inbound: ['inbound_freight', 'inboundfreight', 'frete'],
  packaging: ['packaging_cost', 'packagingcost', 'embalagem'],
  other: ['other_cost', 'othercost', 'outros'],
};

/** Split de uma linha CSV respeitando aspas duplas (campos com vírgula). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseCostCsv(csv: string): CostCsvRow[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const find = (names: readonly string[]): number => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };
  const at = { sku: find(COLS.sku), acq: find(COLS.acquisition), inb: find(COLS.inbound), pkg: find(COLS.packaging), oth: find(COLS.other) };

  const num = (cells: string[], i: number): number => {
    if (i < 0) return 0;
    const v = Number((cells[i] ?? '').replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  };

  const rows: CostCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const sku = at.sku >= 0 ? cells[at.sku] : '';
    if (!sku) continue;
    rows.push({
      sku,
      acquisitionCost: num(cells, at.acq),
      inboundFreight: num(cells, at.inb),
      packagingCost: num(cells, at.pkg),
      otherCost: num(cells, at.oth),
    });
  }
  return rows;
}
