import { decodeColor, type GradientFill } from '../decodeStyles';

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

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export const FONT_WEIGHTS = ['normal', 'bold'] as const;
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
