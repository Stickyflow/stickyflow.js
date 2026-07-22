// src/shared/ui/ShadowPicker/types.ts

/** Configurable drop-shadow styling, shared between Shapes and Links */
export interface ShadowStyle {
  enabled: boolean;
  color: string;     // hex color, e.g. '#000000'
  opacity: number;   // 0-1
  blur: number;      // blur radius in px (world units, divide by scale when rendering)
  angle: number;     // direction of the shadow offset, 0-360 degrees
  distance: number;  // offset distance in px (world units, divide by scale when rendering)
}

/** Default shadow configuration used when a shape/link has no shadow configured yet */
export const DEFAULT_SHADOW_STYLE: ShadowStyle = {
  enabled: false,
  color: '#000000',
  opacity: 0.3,
  blur: 10,
  angle: 45,
  distance: 4,
};

/** Convert angle (degrees) + distance into a Konva-style shadowOffset {x, y} */
export function getShadowOffset(angle: number, distance: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
  };
}
