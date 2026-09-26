import type { GradientColorObject, MeshGradientObject } from '../../../model/shapes';

export { contrastTextColor, sameHueTint } from '../../color';

export function representativeColor(
  value: string | GradientColorObject | MeshGradientObject | undefined,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value.type === 'gradient') {
    return value.stops[0]?.color ?? fallback;
  }
  return value.points[0]?.color ?? fallback;
}
