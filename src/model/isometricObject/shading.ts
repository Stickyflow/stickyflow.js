function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) {
    return null;
  }
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(channel => clamp255(channel).toString(16).padStart(2, '0')).join('')}`;
}

function multiply(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }
  const [r, g, b] = rgb;
  return rgbToHex(r * factor, g * factor, b * factor);
}

export interface IsometricFaceFills {
  topFill: string;
  frontFill: string;
  sideFill: string;
}

/** Derives the front/side face shades from a single base color (the top
 *  face) by uniformly darkening each RGB channel, instead of three
 *  independently chosen fills that can drift out of sync with each other -
 *  one color in, a consistent three-face cube out. */
export function deriveFaceFills(fill: string): IsometricFaceFills {
  return {
    topFill: fill,
    frontFill: multiply(fill, 0.88),
    sideFill: multiply(fill, 0.76),
  };
}
