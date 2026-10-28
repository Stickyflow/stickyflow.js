import { decodeColor, type GradientFill } from '../../styleDecoding';

export const numOf = (value?: string): number | undefined => (value === undefined ? undefined : Number(value));

export function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function dashArray(value?: string): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = safeJson(value);
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  const numbers = parsed.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry));
  return numbers.length === parsed.length ? numbers : undefined;
}

export function solidColor(value?: string): string | undefined {
  const decoded = decodeColor(value);
  return typeof decoded === 'string' ? decoded : undefined;
}

const CSS_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|[a-z][\w-]*)$/i;

export function cssColor(value?: string): string | undefined {
  return value && CSS_COLOR.test(value) ? value : undefined;
}

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export const FONT_WEIGHTS = ['normal', 'bold'] as const;
export const SHAPE_FONT_WEIGHTS = [
  'normal',
  'bold',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
] as const;
export const LABEL_POSITIONS = ['top', 'bottom', 'left', 'right'] as const;
export const PATH_MARKERS = ['none', 'arrow', 'filled_arrow'] as const;
export const BORDER_STYLES = ['none', 'single', 'double'] as const;

export function strokePaint(value?: string): string | GradientFill | undefined {
  const decoded = decodeColor(value);
  if (decoded === undefined || typeof decoded === 'string') {
    return decoded;
  }
  return decoded.type === 'gradient' ? decoded : undefined;
}

export const TEXT_ALIGNS = ['left', 'center', 'right'] as const;
export const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;
export const STROKE_STYLES = ['solid', 'dashed', 'dotted'] as const;
export const PATH_TYPES = ['straight', 'curved', 'orthogonal'] as const;

export function optionalOneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value !== undefined && allowed.includes(value as T) ? (value as T) : undefined;
}

// How a shape mixes with what lies under it. They are the blend modes of CSS.
export const BLEND_MODES = [
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

export const SHAPE_STROKE_STYLES = ['solid', 'dashed', 'dotted', 'double'] as const;
export const MARKER_TYPES = [
  'none',
  'arrow',
  'filled_arrow',
  'circle',
  'filled_circle',
  'diamond',
  'filled_diamond',
  'bar',
  'triangle',
  'one',
  'zero_one',
  'many',
  'one_many',
  'zero_many',
] as const;
