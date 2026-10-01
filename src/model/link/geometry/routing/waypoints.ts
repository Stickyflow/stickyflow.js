import { type PathSegment, roundOrthogonalPath } from '../../../geometry/routing';
import type { ConnectionPoint, PathPointsResult } from './types';

const ORTHOGONAL_EPSILON = 0.5;

export function pathFromWaypoints(
  from: ConnectionPoint,
  waypoints: ConnectionPoint[],
  to: ConnectionPoint,
): PathPointsResult {
  const corners = [from, ...waypoints, to];
  const points: number[] = [];
  for (const point of corners) {
    points.push(point.x, point.y);
  }

  const segments: PathSegment[] = [];
  for (let index = 0; index < points.length - 2; index += 2) {
    const start = { x: points[index], y: points[index + 1] };
    const end = { x: points[index + 2], y: points[index + 3] };
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    segments.push({
      start,
      end,
      midpoint,
      originalMidpoint: midpoint,
      isHorizontal: Math.abs(end.x - start.x) > Math.abs(end.y - start.y),
      canMove: false,
    });
  }

  return { points: roundOrthogonalPath(points, 10), segments };
}

export function isAxisAligned(segments: PathSegment[]): boolean {
  return segments.every(segment => {
    const dx = Math.abs(segment.end.x - segment.start.x);
    const dy = Math.abs(segment.end.y - segment.start.y);
    return dx <= ORTHOGONAL_EPSILON || dy <= ORTHOGONAL_EPSILON;
  });
}
