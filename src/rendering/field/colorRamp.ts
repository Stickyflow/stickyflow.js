import type { ChartRamp } from '../../model/charts';
import { hexToRgb, rgbToHex } from '../../model/colorConversion';

const RAMP_FALLBACK_COLOR = '#94a3b8';

function mixRampColors(start: string, end: string, ratio: number): string {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  return rgbToHex(
    Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio),
    Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio),
    Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio),
  );
}

export function colorAtRamp(ramp: ChartRamp | undefined, value: number): string {
  if (!ramp?.stops.length) {
    return RAMP_FALLBACK_COLOR;
  }

  const stops = [...ramp.stops].sort((first, second) => first.position - second.position);
  if (stops.length === 1 || value <= stops[0].position) {
    return stops[0].color;
  }
  const last = stops[stops.length - 1];
  if (value >= last.position) {
    return last.color;
  }

  for (let index = 0; index < stops.length - 1; index++) {
    const start = stops[index];
    const end = stops[index + 1];
    if (value >= start.position && value <= end.position) {
      const span = end.position - start.position;
      const ratio = span === 0 ? 0 : (value - start.position) / span;
      return mixRampColors(start.color, end.color, ratio);
    }
  }
  return last.color;
}
