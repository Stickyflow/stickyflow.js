import type { GradientColor } from '../color';
import { interpolateHexColorStops } from '../color';
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
  return interpolateHexColorStops(colorValue.stops, projection * 100);
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
