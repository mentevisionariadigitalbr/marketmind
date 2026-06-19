import type { TrendDirection } from './kpi';
import { growthRate } from './calculators';

export interface Trend {
  readonly direction: TrendDirection;
  /** Variação como fração (0.1 = +10%). */
  readonly changePct: number;
}

/**
 * Tendência atual vs. anterior. `flatThreshold` (fração) evita ruído: variações
 * menores que ele são tratadas como estáveis.
 */
export function computeTrend(current: number, previous: number, flatThreshold = 0.005): Trend {
  const changePct = growthRate(current, previous);
  let direction: TrendDirection = 'flat';
  if (changePct > flatThreshold) direction = 'up';
  else if (changePct < -flatThreshold) direction = 'down';
  return { direction, changePct };
}
