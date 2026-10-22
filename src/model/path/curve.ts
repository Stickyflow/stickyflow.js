import type { Point } from '../geometry/types';
import type { PathPoint } from './types';

export interface PathCurve {
  points: readonly PathPoint[];
  tension: number;
  closed: boolean;
}

export interface PathSegment {
  from: Point;
  to: Point;
  controls: [Point, Point] | null;
}

const SAMPLES_PER_SEGMENT = 8;

export function pointTension(curve: PathCurve, point: PathPoint): number {
  return Math.max(0, point.tension ?? curve.tension);
}

export function isStraight(curve: PathCurve): boolean {
  return curve.points.length < 3 || curve.points.every(point => pointTension(curve, point) <= 0);
}

function pointAt(curve: PathCurve, index: number): PathPoint {
  const { points } = curve;
  if (curve.closed) {
    return points[(index + points.length) % points.length];
  }
  return points[Math.max(0, Math.min(points.length - 1, index))];
}

export function pathSegments(curve: PathCurve): PathSegment[] {
  const count = curve.closed ? curve.points.length : curve.points.length - 1;
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const previous = pointAt(curve, index - 1);
    const from = pointAt(curve, index);
    const to = pointAt(curve, index + 1);
    const next = pointAt(curve, index + 2);
    const fromFactor = pointTension(curve, from) / 6;
    const toFactor = pointTension(curve, to) / 6;
    if (fromFactor === 0 && toFactor === 0) {
      return { from, to, controls: null };
    }
    const first = { x: from.x + (to.x - previous.x) * fromFactor, y: from.y + (to.y - previous.y) * fromFactor };
    const second = { x: to.x - (next.x - from.x) * toFactor, y: to.y - (next.y - from.y) * toFactor };
    return { from, to, controls: [first, second] as [Point, Point] };
  });
}

function bezierAt(segment: PathSegment & { controls: [Point, Point] }, t: number): Point {
  const { from, to, controls } = segment;
  const u = 1 - t;
  const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const anchors = [from, controls[0], controls[1], to];
  return {
    x: anchors.reduce((sum, anchor, i) => sum + anchor.x * weights[i], 0),
    y: anchors.reduce((sum, anchor, i) => sum + anchor.y * weights[i], 0),
  };
}

export function flattenPath(curve: PathCurve, samples = SAMPLES_PER_SEGMENT): Point[] {
  if (isStraight(curve)) {
    return curve.points.map(point => ({ x: point.x, y: point.y }));
  }
  const flat: Point[] = [];
  const segments = pathSegments(curve);
  segments.forEach(segment => {
    flat.push({ x: segment.from.x, y: segment.from.y });
    if (segment.controls) {
      const curved = { ...segment, controls: segment.controls };
      for (let step = 1; step < samples; step++) {
        flat.push(bezierAt(curved, step / samples));
      }
    }
  });
  const last = segments[segments.length - 1];
  if (!curve.closed && last) {
    flat.push({ x: last.to.x, y: last.to.y });
  }
  return flat;
}
