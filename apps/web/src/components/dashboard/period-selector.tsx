import Link from 'next/link';

type Preset = { value: string; label: string };

const DEFAULT_PRESETS: Preset[] = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '180d', label: '180 dias' },
  { value: '365d', label: '365 dias' },
];

/** Seletor de período por querystring (?preset=). Server-friendly (links).
 *  `presets` permite customizar as opções (ex.: 7/15/30 dias + mês). */
export function PeriodSelector({
  basePath,
  current,
  presets = DEFAULT_PRESETS,
}: {
  basePath: string;
  current: string;
  presets?: Preset[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
      {presets.map((p) => {
        const active = p.value === current;
        return (
          <Link
            key={p.value}
            href={`${basePath}?preset=${p.value}`}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
