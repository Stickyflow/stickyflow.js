import type { ResolvedShadow, ShadowStyle } from './types';

export const DEFAULT_SHADOW_STYLE: ShadowStyle = {
  enabled: false,
  color: '#000000',
  opacity: 0.3,
  blur: 10,
  angle: 45,
  distance: 4,
};

export function getShadowOffset(angle: number, distance: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
  };
}

export function resolveShadow(shadow: ShadowStyle | undefined): ResolvedShadow | undefined {
  if (!shadow?.enabled) {
    return undefined;
  }
  const offset = getShadowOffset(shadow.angle ?? 45, shadow.distance ?? 5);
  return {
    color: shadow.color ?? '#000000',
    opacity: shadow.opacity ?? 0.25,
    blur: shadow.blur ?? 10,
    dx: offset.x,
    dy: offset.y,
  };
}
