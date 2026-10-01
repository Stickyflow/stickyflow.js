import { hexToRgb, rgbToHex } from './colorConversion';

export interface PositionedColorStop {
  position: number;
  color: string;
}

function mixHexColors(start: string, end: string, ratio: number): string {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  const startAlpha = startRgb.a ?? 1;
  const endAlpha = endRgb.a ?? 1;
  return rgbToHex(
    Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio),
    Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio),
    Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio),
    startAlpha + (endAlpha - startAlpha) * ratio,
  );
}

export function interpolateHexColorStops(stops: PositionedColorStop[], position: number): string {
  const sortedStops = [...stops].sort((first, second) => first.position - second.position);
  const first = sortedStops[0];
  const last = sortedStops[sortedStops.length - 1];
  if (position <= first.position) {
    return first.color;
  }
  if (position >= last.position) {
    return last.color;
  }

  for (let index = 0; index < sortedStops.length - 1; index++) {
    const start = sortedStops[index];
    const end = sortedStops[index + 1];
    if (position >= start.position && position <= end.position) {
      const range = end.position - start.position;
      const ratio = range === 0 ? 0 : (position - start.position) / range;
      return mixHexColors(start.color, end.color, ratio);
    }
  }
  return last.color;
}
