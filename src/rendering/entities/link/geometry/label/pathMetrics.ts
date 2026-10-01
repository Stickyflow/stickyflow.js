import type { Point } from '../../../../../model/geometry/types';

export type { Point } from '../../../../../model/geometry/types';

export const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

export function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

export function splitCubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
  const a = lerpPoint(p0, p1, t);
  const b = lerpPoint(p1, p2, t);
  const c = lerpPoint(p2, p3, t);
  const d = lerpPoint(a, b, t);
  const e = lerpPoint(b, c, t);
  const f = lerpPoint(d, e, t);
  return { left: [p0, a, d, f], right: [f, e, c, p3] };
}

export function pointAtArcLength(points: number[], targetLength: number): { point: Point; segmentIndex: number } {
  const lastIndex = points.length - 2;
  if (targetLength <= 0) {
    return { point: { x: points[0], y: points[1] }, segmentIndex: 0 };
  }

  let accumulated = 0;
  for (let index = 0; index < lastIndex; index += 2) {
    const start = { x: points[index], y: points[index + 1] };
    const end = { x: points[index + 2], y: points[index + 3] };
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (accumulated + length >= targetLength) {
      const ratio = length === 0 ? 0 : (targetLength - accumulated) / length;
      return { point: lerpPoint(start, end, ratio), segmentIndex: index };
    }
    accumulated += length;
  }
  return { point: { x: points[lastIndex], y: points[lastIndex + 1] }, segmentIndex: lastIndex };
}

export function polylineLength(points: number[]): number {
  let total = 0;
  for (let index = 0; index < points.length - 2; index += 2) {
    total += Math.hypot(points[index + 2] - points[index], points[index + 3] - points[index + 1]);
  }
  return total;
}

export function bezierArcLength(p0: Point, p1: Point, p2: Point, p3: Point, samples = 40): number {
  let total = 0;
  let previous = p0;
  for (let index = 1; index <= samples; index++) {
    const point = cubicBezierPoint(p0, p1, p2, p3, index / samples);
    total += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return total;
}
