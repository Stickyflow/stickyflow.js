import { cubicBezierPoint, type Point, splitCubicBezier } from './pathMetrics';
import type { LabelGapClearance, LabelGapSplit } from './types';

const SAMPLES = 40;

function sampledArcLengths(points: [Point, Point, Point, Point]): number[] {
  const lengths = [0];
  let previous = points[0];
  for (let index = 1; index <= SAMPLES; index++) {
    const point = cubicBezierPoint(...points, index / SAMPLES);
    lengths.push(lengths[index - 1] + Math.hypot(point.x - previous.x, point.y - previous.y));
    previous = point;
  }
  return lengths;
}

function parameterAtLength(lengths: number[], target: number): number {
  const total = lengths[SAMPLES];
  if (target <= 0) {
    return 0;
  }
  if (target >= total) {
    return 1;
  }
  for (let index = 1; index <= SAMPLES; index++) {
    if (lengths[index] >= target) {
      const fraction = (target - lengths[index - 1]) / (lengths[index] - lengths[index - 1] || 1);
      return (index - 1 + fraction) / SAMPLES;
    }
  }
  return 1;
}

function projectedGapHalfLength(
  points: [Point, Point, Point, Point],
  clearance: LabelGapClearance,
  maximum: number,
): number {
  const [p0, p1, p2, p3] = points;
  const dx = 0.75 * (p1.x - p0.x) + 1.5 * (p2.x - p1.x) + 0.75 * (p3.x - p2.x);
  const dy = 0.75 * (p1.y - p0.y) + 1.5 * (p2.y - p1.y) + 0.75 * (p3.y - p2.y);
  const length = Math.hypot(dx, dy);
  const ux = length === 0 ? 1 : Math.abs(dx) / length;
  const uy = length === 0 ? 0 : Math.abs(dy) / length;
  return Math.min(clearance.halfWidth * ux + clearance.halfHeight * uy, maximum);
}

export function splitCurvedPath(flatPoints: number[], clearance: LabelGapClearance): LabelGapSplit | null {
  if (flatPoints.length < 8) {
    return null;
  }
  const points = curvedControlPoints(flatPoints);
  const lengths = sampledArcLengths(points);
  const total = lengths[SAMPLES];
  if (total === 0) {
    return null;
  }

  const half = total / 2;
  const maximumGap = Math.max(0, half - clearance.minimumVisibleStub);
  const gapHalfLength = projectedGapHalfLength(points, clearance, maximumGap);
  const beforeParameter = parameterAtLength(lengths, half - gapHalfLength);
  const afterParameter = parameterAtLength(lengths, half + gapHalfLength);
  return {
    before: curvedPathBeforeGap(points, beforeParameter),
    after: curvedPathAfterGap(points, afterParameter),
    bezier: true,
  };
}

function curvedControlPoints(flatPoints: number[]): [Point, Point, Point, Point] {
  return [
    { x: flatPoints[0], y: flatPoints[1] },
    { x: flatPoints[2], y: flatPoints[3] },
    { x: flatPoints[4], y: flatPoints[5] },
    { x: flatPoints[6], y: flatPoints[7] },
  ];
}

function curvedPathBeforeGap(points: [Point, Point, Point, Point], parameter: number): number[] | null {
  if (parameter <= 0.01) {
    return null;
  }
  return splitCubicBezier(...points, parameter).left.flatMap(point => [point.x, point.y]);
}

function curvedPathAfterGap(points: [Point, Point, Point, Point], parameter: number): number[] | null {
  if (parameter >= 0.99) {
    return null;
  }
  return splitCubicBezier(...points, parameter).right.flatMap(point => [point.x, point.y]);
}
