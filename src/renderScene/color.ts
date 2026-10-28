import { parseHexRgb, rgbToHex } from '../model/color';

// A color of a scene is written with its '#', and anything else is not a color to work out.
function hexToRgb(hex: string | undefined): [number, number, number] | undefined {
  return hex?.startsWith('#') ? (parseHexRgb(hex) ?? undefined) : undefined;
}

export function colorWithAlpha(hex: string | undefined, alpha: number): string {
  const rgb = hexToRgb(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  if (!rgb) {
    return clamped <= 0 ? 'transparent' : (hex ?? 'transparent');
  }
  const [red, green, blue] = rgb;
  return `rgba(${red}, ${green}, ${blue}, ${clamped})`;
}

function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) {
    return [0, 0, lightness];
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  hue *= 60;
  if (hue < 0) {
    hue += 360;
  }
  return [hue, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let [r, g, b] = [0, 0, 0];
  if (hue < 60) {
    [r, g, b] = [chroma, x, 0];
  } else if (hue < 120) {
    [r, g, b] = [x, chroma, 0];
  } else if (hue < 180) {
    [r, g, b] = [0, chroma, x];
  } else if (hue < 240) {
    [r, g, b] = [0, x, chroma];
  } else if (hue < 300) {
    [r, g, b] = [x, 0, chroma];
  } else {
    [r, g, b] = [chroma, 0, x];
  }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function relativeLuminance(red: number, green: number, blue: number): number {
  const linear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

function contrastRatio(luminanceA: number, luminanceB: number): number {
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

const SAME_HUE_LIGHTNESS_GAP = 0.35;
const SAME_HUE_MIN_LIGHTNESS = 0.08;
const SAME_HUE_MAX_LIGHTNESS = 0.22;
const SAME_HUE_LIGHT_MIN_LIGHTNESS = 0.78;
const SAME_HUE_LIGHT_MAX_LIGHTNESS = 0.92;
const SAME_HUE_MIN_CONTRAST = 3;

export function contrastTextColor(hex: string | undefined): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return '#0f172a';
  }
  const [red, green, blue] = rgb;
  const fallback = (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.6 ? '#0f172a' : '#ffffff';
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
  if (saturation === 0) {
    return fallback;
  }
  const targetLightness =
    lightness > 0.5
      ? Math.max(SAME_HUE_MIN_LIGHTNESS, Math.min(lightness - SAME_HUE_LIGHTNESS_GAP, SAME_HUE_MAX_LIGHTNESS))
      : Math.min(
          SAME_HUE_LIGHT_MAX_LIGHTNESS,
          Math.max(lightness + SAME_HUE_LIGHTNESS_GAP, SAME_HUE_LIGHT_MIN_LIGHTNESS),
        );
  const variant = hslToRgb(hue, saturation, targetLightness);
  const ratio = contrastRatio(relativeLuminance(red, green, blue), relativeLuminance(...variant));
  return ratio >= SAME_HUE_MIN_CONTRAST ? rgbToHex(...variant) : fallback;
}

export function sameHueContrastColor(hex: string | undefined, fallback: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return fallback;
  }
  const [red, green, blue] = rgb;
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
  if (saturation === 0) {
    return fallback;
  }
  const targetLightness =
    lightness > 0.5
      ? Math.max(SAME_HUE_MIN_LIGHTNESS, Math.min(lightness - SAME_HUE_LIGHTNESS_GAP, SAME_HUE_MAX_LIGHTNESS))
      : Math.min(
          SAME_HUE_LIGHT_MAX_LIGHTNESS,
          Math.max(lightness + SAME_HUE_LIGHTNESS_GAP, SAME_HUE_LIGHT_MIN_LIGHTNESS),
        );
  return rgbToHex(...hslToRgb(hue, saturation, targetLightness));
}

export function isLightColor(hex: string | undefined): boolean {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(...rgb)[2] > 0.5 : false;
}

export function sameHueTint(hex: string | undefined, targetLightness: number): string | undefined {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return undefined;
  }
  const [hue, saturation] = rgbToHsl(...rgb);
  if (saturation === 0) {
    return undefined;
  }
  return rgbToHex(...hslToRgb(hue, saturation, targetLightness));
}
