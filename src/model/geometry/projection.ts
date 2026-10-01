import type { Point } from './types';

export function projectedPosition(axisStart: Point, axisEnd: Point, point: Point): number {
  const deltaX = axisEnd.x - axisStart.x;
  const deltaY = axisEnd.y - axisStart.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return 0;
  }
  const projection = ((point.x - axisStart.x) * deltaX + (point.y - axisStart.y) * deltaY) / lengthSquared;
  return Math.max(0, Math.min(1, projection));
}
