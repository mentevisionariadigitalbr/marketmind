/**
 * Converte durações no formato "15m", "7d", "3600s", "1h" em milissegundos.
 */
const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Duração inválida: "${value}". Use formatos como "15m", "7d".`);
  }
  const amount = Number(match[1]);
  return amount * UNIT_MS[match[2]];
}
