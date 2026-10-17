export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(value: string): string | null {
  const raw = value.trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (!HEX.test(withHash)) {
    return null;
  }
  const body = withHash.slice(1);
  const full =
    body.length === 3
      ? body
          .split('')
          .map(char => char + char)
          .join('')
      : body;
  return `#${full.toLowerCase()}`;
}

const COLOR_FUNCTION =
  /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*(\d*\.?\d+)(%?)\s*)?\)$/i;
const HEX_WITH_ALPHA = /^#([0-9a-f]{6})([0-9a-f]{2})$/i;

export interface ColorAlpha {
  hex: string;
  alpha: number;
}

export function parseColorAlpha(value: string): ColorAlpha | null {
  const raw = value.trim();
  const fn = COLOR_FUNCTION.exec(raw);
  if (fn) {
    const alpha = fn[4] === undefined ? 1 : Number(fn[4]) / (fn[5] ? 100 : 1);
    return {
      hex: rgbToHex({ r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) }),
      alpha: Math.max(0, Math.min(1, alpha)),
    };
  }
  const eight = HEX_WITH_ALPHA.exec(raw);
  if (eight) {
    return { hex: `#${eight[1].toLowerCase()}`, alpha: Number.parseInt(eight[2], 16) / 255 };
  }
  const hex = normalizeHex(raw);
  return hex ? { hex, alpha: 1 } : null;
}

export function formatColorAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  if (clamped >= 1) {
    return hex;
  }
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(clamped * 100) / 100})`;
}

export function hexOf(value: string): string {
  return parseColorAlpha(value)?.hex ?? '#000000';
}

export function alphaOf(value: string): number {
  return parseColorAlpha(value)?.alpha ?? 1;
}

export function isHexColor(value: string): boolean {
  return normalizeHex(value) !== null;
}

export function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex) ?? '#000000';
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(rgb: Rgb): string {
  const channel = (value: number) => clampChannel(value).toString(16).padStart(2, '0');
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

export function hsvToRgb(hsv: Hsv): Rgb {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = Math.max(0, Math.min(1, hsv.s));
  const v = Math.max(0, Math.min(1, hsv.v));
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const sector = Math.floor(h / 60);
  const table: readonly (readonly [number, number, number])[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r, g, b] = table[sector] ?? table[0];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

export function rgbToHsv(rgb: Rgb): Hsv {
  const r = clampChannel(rgb.r) / 255;
  const g = clampChannel(rgb.g) / 255;
  const b = clampChannel(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) {
    h += 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hexToHsv(hex: string): Hsv {
  return rgbToHsv(hexToRgb(hex));
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}
