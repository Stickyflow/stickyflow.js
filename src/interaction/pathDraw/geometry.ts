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

const EIGHTH_TURN = Math.PI / 4;

export function snapTo45Degrees(reference: DrawPoint, point: DrawPoint): DrawPoint {
  const dx = point.x - reference.x;
  const dy = point.y - reference.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    return point;
  }
  const angle = Math.round(Math.atan2(dy, dx) / EIGHTH_TURN) * EIGHTH_TURN;
  return { x: reference.x + Math.cos(angle) * distance, y: reference.y + Math.sin(angle) * distance };
}
