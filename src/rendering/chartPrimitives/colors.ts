import type { GradientColorObject, MeshGradientObject } from '../../model/shapes';

export function representativeColor(
  value: string | GradientColorObject | MeshGradientObject | undefined,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value.type === 'gradient') {
    return value.stops[0]?.color ?? fallback;
  }
  return value.points[0]?.color ?? fallback;
}

export function contrastTextColor(hex: string | undefined): string {
  if (hex?.[0] !== '#') {
    return '#0f172a';
  }

  const channels =
    hex.length === 4
      ? hex
          .slice(1)
          .split('')
          .map(channel => parseInt(channel + channel, 16))
      : [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const [red, green, blue] = channels;
  if ([red, green, blue].some(channel => Number.isNaN(channel))) {
    return '#0f172a';
  }
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.6 ? '#0f172a' : '#ffffff';
}
