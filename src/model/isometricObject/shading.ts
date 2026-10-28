import { parseHexRgb, rgbToHex } from '../color';

function multiply(hex: string, factor: number): string {
  const rgb = parseHexRgb(hex);
  if (!rgb) {
    return hex;
  }
  const [r, g, b] = rgb;
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function shadeFill(fill: string, factor: number): string {
  return multiply(fill, factor);
}

export interface IsometricFaceFills {
  topFill: string;
  frontFill: string;
  sideFill: string;
}

export function deriveFaceFills(fill: string): IsometricFaceFills {
  return {
    topFill: fill,
    frontFill: multiply(fill, 0.95),
    sideFill: multiply(fill, 0.88),
  };
}
