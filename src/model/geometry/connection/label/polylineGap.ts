import { type Point, pointAtArcLength, polylineLength } from './pathMetrics';
import type { LabelGapClearance, LabelGapSplit } from './types';

type PolylineGapPlacement = {
  beforeLength: number;
  afterLength: number;
};

export function splitPolylinePath(points: number[], clearance: LabelGapClearance): LabelGapSplit | null {
  if (points.length < 4) {
    return null;
  }
  const total = polylineLength(points);
  if (total === 0) {
    return null;
  }

  const placement = polylineGapPlacement(points, total, clearance);
  return {
    before: polylineBeforeGap(points, placement.beforeLength),
    after: polylineAfterGap(points, placement.afterLength, total),
    bezier: false,
  };
}

function polylineGapPlacement(
  points: number[],
  totalLength: number,
  clearance: LabelGapClearance,
): PolylineGapPlacement {
  const half = totalLength / 2;
  const midpoint = pointAtArcLength(points, half);
  const start = { x: points[midpoint.segmentIndex], y: points[midpoint.segmentIndex + 1] };
  const end = { x: points[midpoint.segmentIndex + 2], y: points[midpoint.segmentIndex + 3] };
  const gapHalfLength = projectedPolylineGap(start, end, clearance, half);
  return { beforeLength: half - gapHalfLength, afterLength: half + gapHalfLength };
}

function projectedPolylineGap(start: Point, end: Point, clearance: LabelGapClearance, halfLength: number): number {
  const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
  const horizontalShare = segmentLength === 0 ? 1 : Math.abs(end.x - start.x) / segmentLength;
  const verticalShare = segmentLength === 0 ? 0 : Math.abs(end.y - start.y) / segmentLength;
  const projectedClearance = clearance.halfWidth * horizontalShare + clearance.halfHeight * verticalShare;
  return Math.min(projectedClearance, Math.max(0, halfLength - clearance.minimumVisibleStub));
}

function polylineBeforeGap(points: number[], splitLength: number): number[] | null {
  if (splitLength <= 0.5) {
    return null;
  }
  const split = pointAtArcLength(points, splitLength);
  return [...points.slice(0, split.segmentIndex + 2), split.point.x, split.point.y];
}

function polylineAfterGap(points: number[], splitLength: number, totalLength: number): number[] | null {
  if (splitLength >= totalLength - 0.5) {
    return null;
  }
  const split = pointAtArcLength(points, splitLength);
  return [split.point.x, split.point.y, ...points.slice(split.segmentIndex + 2)];
}
