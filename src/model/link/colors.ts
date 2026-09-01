import { hexToRgb, rgbToHex } from '../colorConversion';
import type { GradientColor } from '../colors';
import type { LinkStyle } from './types';

type LinkColor = LinkStyle['color'] | { type: 'solid'; color: string } | null | undefined;

export function getLinkStrokeColor(colorValue: LinkColor): string | undefined {
  if (!colorValue) {
    return undefined;
  }
  if (typeof colorValue === 'string') {
    return colorValue;
  }
  if (colorValue.type === 'gradient') {
    return colorValue.stops?.[0]?.color;
  }
  if (colorValue.type === 'solid') {
    return colorValue.color;
  }
  return undefined;
}

export function getLinkEndpointColor(colorValue: LinkColor, end: 'start' | 'end'): string | undefined {
  if (isGradientWithStops(colorValue)) {
    return end === 'start' ? colorValue.stops[0].color : colorValue.stops[colorValue.stops.length - 1].color;
  }
  return getLinkStrokeColor(colorValue);
}

export function getLinkColorAtPoint(
  colorValue: LinkColor,
  points: number[],
  point: { x: number; y: number },
): string | undefined {
  if (!isGradientWithStops(colorValue)) {
    return getLinkStrokeColor(colorValue);
  }
  if (points.length < 4) {
    return colorValue.stops[0]?.color;
  }

  const axisStart = { x: points[0], y: points[1] };
  const axisEnd = { x: points[points.length - 2], y: points[points.length - 1] };
  const projection = projectedPosition(axisStart, axisEnd, point);
  return gradientColorAtPosition(colorValue.stops, projection * 100);
}

function isGradientWithStops(colorValue: LinkColor): colorValue is GradientColor {
  return Boolean(
    colorValue && typeof colorValue === 'object' && colorValue.type === 'gradient' && colorValue.stops?.length,
  );
}

function projectedPosition(
  axisStart: { x: number; y: number },
  axisEnd: { x: number; y: number },
  point: { x: number; y: number },
): number {
  const deltaX = axisEnd.x - axisStart.x;
  const deltaY = axisEnd.y - axisStart.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return 0;
  }
  const projection = ((point.x - axisStart.x) * deltaX + (point.y - axisStart.y) * deltaY) / lengthSquared;
  return Math.max(0, Math.min(1, projection));
}

function gradientColorAtPosition(stops: GradientColor['stops'], position: number): string {
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);
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

function mixHexColors(start: string, end: string, ratio: number): string {
  const startRgb = hexToRgb(start);
  const endRgb = hexToRgb(end);
  return rgbToHex(
    Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio),
    Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio),
    Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio),
  );
}
