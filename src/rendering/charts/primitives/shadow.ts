import type { ShadowStyle } from '../../../model/shadows';
import { finite } from '../../scene';

export interface ResolvedShadow {
  color: string;
  opacity: number;
  blur: number;
  dx: number;
  dy: number;
}

export function resolveChartShadow(shadow: ShadowStyle | undefined): ResolvedShadow | undefined {
  if (!shadow?.enabled) {
    return undefined;
  }
  const angle = (finite(shadow.angle, 45) * Math.PI) / 180;
  const distance = finite(shadow.distance, 5);
  return {
    color: shadow.color ?? '#000000',
    opacity: finite(shadow.opacity, 0.25),
    blur: finite(shadow.blur, 10),
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance,
  };
}
