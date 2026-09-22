export interface DrawPoint {
  x: number;
  y: number;
}

export const MIN_POINTS_TO_CLOSE = 3;
export const MIN_POINTS_OPEN = 2;

export function isCloseToStart(points: readonly DrawPoint[], cursor: DrawPoint, snapDistanceUnits: number): boolean {
  if (points.length < MIN_POINTS_TO_CLOSE) {
    return false;
  }
  const start = points[0];
  return Math.hypot(cursor.x - start.x, cursor.y - start.y) <= snapDistanceUnits;
}
