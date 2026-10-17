import { alphaOf, formatColorAlpha, hexOf, hexToHsv, hsvToHex, parseColorAlpha } from './color';
import {
  DEFAULT_GRADIENT_ANGLE,
  formatGradient,
  type GradientValue,
  gradientCss,
  parseGradient,
  sortStops,
} from './gradientValue';

export const FALLBACK_COLOR = '#888888';

export type PickerValue =
  | { mode: 'solid'; color: string; alpha?: number }
  | { mode: 'gradient'; angle: number; stops: GradientValue['stops'] };

export function seedFrom(fill: string | null, gradient: GradientValue | null): PickerValue {
  if (gradient) {
    return { mode: 'gradient', angle: gradient.angle, stops: sortStops(gradient.stops) };
  }
  const parsed = fill ? parseGradient(fill) : null;
  if (parsed) {
    return { mode: 'gradient', angle: parsed.angle, stops: sortStops(parsed.stops) };
  }
  const solid = fill ? parseColorAlpha(fill) : null;
  return { mode: 'solid', color: solid?.hex ?? FALLBACK_COLOR, alpha: solid?.alpha ?? 1 };
}

export function formatPickerValue(value: PickerValue): string {
  return value.mode === 'solid'
    ? formatColorAlpha(value.color, value.alpha ?? 1)
    : formatGradient({ angle: value.angle, stops: value.stops });
}

export function cssBackground(color: string): string {
  const gradient = parseGradient(color);
  return gradient ? gradientCss(gradient) : color;
}

export function toAlpha(value: PickerValue): number {
  return value.mode === 'solid' ? (value.alpha ?? 1) : alphaOf(sortStops(value.stops)[0]?.color ?? FALLBACK_COLOR);
}

export function toSolid(value: PickerValue): string {
  return value.mode === 'solid' ? value.color : hexOf(sortStops(value.stops)[0]?.color ?? FALLBACK_COLOR);
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
      { color: formatColorAlpha(value.color, value.alpha ?? 1), position: 0 },
      { color: formatColorAlpha(darken(value.color), value.alpha ?? 1), position: 100 },
    ],
  };
}
