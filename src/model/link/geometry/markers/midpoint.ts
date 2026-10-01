import type { PathType } from '../../types';
import type { MarkerPoint } from './types';

function curvedMidpoint(points: number[]): MarkerPoint {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = points;
  const t = 0.5;
  const mt = 1 - t;
  return {
    x: mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
    y: mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3,
  };
}

function orthogonalMidpoint(points: number[], fallback: MarkerPoint): MarkerPoint {
  let totalLength = 0;
  const segments: Array<{ start: MarkerPoint; end: MarkerPoint; length: number }> = [];
  for (let index = 0; index < points.length - 2; index += 2) {
    const start = { x: points[index], y: points[index + 1] };
    const end = { x: points[index + 2], y: points[index + 3] };
    const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    totalLength += length;
    segments.push({ start, end, length });
  }
  const halfLength = totalLength / 2;
  let accumulatedLength = 0;
  for (const segment of segments) {
    if (accumulatedLength + segment.length >= halfLength) {
      const ratio = (halfLength - accumulatedLength) / segment.length;
      return {
        x: segment.start.x + ratio * (segment.end.x - segment.start.x),
        y: segment.start.y + ratio * (segment.end.y - segment.start.y),
      };
    }
    accumulatedLength += segment.length;
  }
  return fallback;
}

export function getLineMidpoint(
  points: number[],
  pathType: PathType,
  effectiveFrom: MarkerPoint,
  effectiveTo: MarkerPoint,
): MarkerPoint {
  if (pathType === 'curved') {
    return curvedMidpoint(points);
  }
  const fallback = {
    x: (effectiveFrom.x + effectiveTo.x) / 2,
    y: (effectiveFrom.y + effectiveTo.y) / 2,
  };
  if (pathType === 'orthogonal') {
    return orthogonalMidpoint(points, fallback);
  }
  return fallback;
}
