import {
  rgbToHex as modelHex,
  hsvToRgb as modelHsvToRgb,
  rgbToHsv as modelRgbToHsv,
  parseHexRgb,
} from '../../../model/color';

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

export function normalizeHex(value: string): string | null {
  const channels = parseHexRgb(value);
  return channels && modelHex(...channels);
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
  const [r, g, b] = parseHexRgb(hex) ?? [0, 0, 0];
  return { r, g, b };
}

export function rgbToHex(rgb: Rgb): string {
  return modelHex(clampChannel(rgb.r), clampChannel(rgb.g), clampChannel(rgb.b));
}

// The picker may be given a hue that has turned around or a part that is out of its range, which the conversion of the model does not take.
export function hsvToRgb(hsv: Hsv): Rgb {
  const { r, g, b } = modelHsvToRgb(
    ((hsv.h % 360) + 360) % 360,
    Math.max(0, Math.min(1, hsv.s)),
    Math.max(0, Math.min(1, hsv.v)),
  );
  return { r, g, b };
}

export function rgbToHsv(rgb: Rgb): Hsv {
  return modelRgbToHsv(clampChannel(rgb.r), clampChannel(rgb.g), clampChannel(rgb.b));
}

export function hexToHsv(hex: string): Hsv {
  return rgbToHsv(hexToRgb(hex));
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}
