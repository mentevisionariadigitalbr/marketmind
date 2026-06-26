'use client';

import { downloadCsv, type CsvCell } from '@/lib/csv';

/**
 * Botão de export genérico. Recebe headers + rows JÁ formatados (serializáveis),
 * então funciona com dados vindos de Server Components. Excel/CSV (pt-BR).
 */
export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = '⭳ Exportar (Excel/CSV)',
}: {
  filename: string;
  headers: string[];
  rows: CsvCell[][];
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, headers, rows)}
      disabled={rows.length === 0}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
    >
      {label}
    </button>
  );
}
