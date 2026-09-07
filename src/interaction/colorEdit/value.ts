import { hexToHsv, hsvToHex, normalizeHex } from './color';
import {
  DEFAULT_GRADIENT_ANGLE,
  formatGradient,
  gradientCss,
  type GradientValue,
  parseGradient,
  sortStops,
} from './gradientValue';

export const FALLBACK_COLOR = '#888888';

export type PickerValue =
  | { mode: 'solid'; color: string }
  | { mode: 'gradient'; angle: number; stops: GradientValue['stops'] };

export function seedFrom(fill: string | null, gradient: GradientValue | null): PickerValue {
  if (gradient) {
    return { mode: 'gradient', angle: gradient.angle, stops: sortStops(gradient.stops) };
  }
  const parsed = fill ? parseGradient(fill) : null;
  if (parsed) {
    return { mode: 'gradient', angle: parsed.angle, stops: sortStops(parsed.stops) };
  }
  return { mode: 'solid', color: (fill && normalizeHex(fill)) || FALLBACK_COLOR };
}

export function formatPickerValue(value: PickerValue): string {
  return value.mode === 'solid' ? value.color : formatGradient({ angle: value.angle, stops: value.stops });
}

export function cssBackground(color: string): string {
  const gradient = parseGradient(color);
  return gradient ? gradientCss(gradient) : color;
}

export function toSolid(value: PickerValue): string {
  return value.mode === 'solid' ? value.color : (sortStops(value.stops)[0]?.color ?? FALLBACK_COLOR);
}

export function darken(hex: string): string {
  const hsv = hexToHsv(hex);
  return hsvToHex({ ...hsv, v: Math.max(0, hsv.v * 0.55) });
}

export function toGradient(value: PickerValue): GradientValue {
  if (value.mode === 'gradient') {
    return { angle: value.angle, stops: sortStops(value.stops) };
  }
  return {
    angle: DEFAULT_GRADIENT_ANGLE,
    stops: [
      { color: value.color, position: 0 },
      { color: darken(value.color), position: 100 },
    ],
  };
}
