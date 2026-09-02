import type { PathSegment } from '../types';
import type { RoutePoint } from './routePlan';

export function describeSegments(
  points: number[],
  originalMidpoints: RoutePoint[],
  canMoveFirstInner: boolean,
  canMoveLastInner: boolean,
): PathSegment[] {
  const totalSegments = (points.length - 2) / 2;
  return originalMidpoints.map((originalMidpoint, segmentIndex) => {
    const offset = segmentIndex * 2;
    const start = { x: points[offset], y: points[offset + 1] };
    const end = { x: points[offset + 2], y: points[offset + 3] };
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const isInner = segmentIndex > 0 && segmentIndex < totalSegments - 1;
    const isMovableEdge =
      segmentIndex === 1 ? canMoveFirstInner : segmentIndex === totalSegments - 2 ? canMoveLastInner : true;
    const hasLength = Math.hypot(end.x - start.x, end.y - start.y) >= 1;

    return {
      start,
      end,
      midpoint,
      originalMidpoint,
      isHorizontal: Math.abs(end.x - start.x) > Math.abs(end.y - start.y),
      canMove: isInner && isMovableEdge && hasLength,
    };
  });
}
