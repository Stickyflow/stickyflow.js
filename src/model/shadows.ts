export interface ShadowStyle {
  enabled: boolean;
  color?: string;
  opacity?: number;
  blur?: number;
  angle?: number;
  distance?: number;
}

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
