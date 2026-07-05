/**
 * Utilitário de exportação CSV (Fase 2) — reutilizável por qualquer tabela.
 * Separador ';' + BOM UTF-8 → abre direto no Excel pt-BR. Apenas no cliente.
 */
export type CsvCell = string | number | null | undefined;

function escapeCell(value: CsvCell): string {
  const s = value == null ? '' : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(';'));
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const blob = new Blob(['﻿' + buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
