import { pointAtArcLength, polylineLength } from './pathMetrics';
import type { LabelGapSplit } from './types';

export function splitPolylinePath(
  points: number[],
  gapHalfWidth: number,
  gapHalfHeight: number,
  minimumVisibleStub: number,
): LabelGapSplit | null {
  if (points.length < 4) {
    return null;
  }
  const total = polylineLength(points);
  if (total === 0) {
    return null;
  }

  const half = total / 2;
  const midpoint = pointAtArcLength(points, half);
  const start = { x: points[midpoint.segmentIndex], y: points[midpoint.segmentIndex + 1] };
  const end = { x: points[midpoint.segmentIndex + 2], y: points[midpoint.segmentIndex + 3] };
  const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
  const ux = segmentLength === 0 ? 1 : Math.abs(end.x - start.x) / segmentLength;
  const uy = segmentLength === 0 ? 0 : Math.abs(end.y - start.y) / segmentLength;
  const gapHalfLength = Math.min(gapHalfWidth * ux + gapHalfHeight * uy, Math.max(0, half - minimumVisibleStub));
  const beforeLength = half - gapHalfLength;
  const afterLength = half + gapHalfLength;

  const beforeSplit = beforeLength > 0.5 ? pointAtArcLength(points, beforeLength) : null;
  const afterSplit = afterLength < total - 0.5 ? pointAtArcLength(points, afterLength) : null;
  const before = beforeSplit
    ? [...points.slice(0, beforeSplit.segmentIndex + 2), beforeSplit.point.x, beforeSplit.point.y]
    : null;
  const after = afterSplit
    ? [afterSplit.point.x, afterSplit.point.y, ...points.slice(afterSplit.segmentIndex + 2)]
    : null;
  return { before, after, bezier: false };
}
