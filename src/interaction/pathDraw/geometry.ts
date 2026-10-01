import type { GuideLine } from '../../domContract';

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

export interface SessionGuideSnap {
  point: DrawPoint;
  guide: GuideLine | null;
}

export function snapToSessionGuides(
  last: DrawPoint,
  angleSnapped: DrawPoint,
  priorPoints: readonly DrawPoint[],
  raw: DrawPoint,
  snapRadiusUnits: number,
): SessionGuideSnap {
  const rayX = angleSnapped.x - last.x;
  const rayY = angleSnapped.y - last.y;
  const length = Math.hypot(rayX, rayY);
  if (length === 0) {
    return { point: angleSnapped, guide: null };
  }
  const ux = rayX / length;
  const uy = rayY / length;

  let best: { point: DrawPoint; guide: GuideLine; distance: number } | null = null;
  for (const prior of priorPoints) {
    if (Math.abs(ux) > 1e-8) {
      const t = (prior.x - last.x) / ux;
      if (t >= 0) {
        const point = { x: prior.x, y: last.y + uy * t };
        const distance = Math.hypot(point.x - raw.x, point.y - raw.y);
        if (distance <= snapRadiusUnits && (!best || distance < best.distance)) {
          best = {
            point,
            guide: {
              orientation: 'vertical',
              position: prior.x,
              from: Math.min(prior.y, point.y),
              to: Math.max(prior.y, point.y),
            },
            distance,
          };
        }
      }
    }
    if (Math.abs(uy) > 1e-8) {
      const t = (prior.y - last.y) / uy;
      if (t >= 0) {
        const point = { x: last.x + ux * t, y: prior.y };
        const distance = Math.hypot(point.x - raw.x, point.y - raw.y);
        if (distance <= snapRadiusUnits && (!best || distance < best.distance)) {
          best = {
            point,
            guide: {
              orientation: 'horizontal',
              position: prior.y,
              from: Math.min(prior.x, point.x),
              to: Math.max(prior.x, point.x),
            },
            distance,
          };
        }
      }
    }
  }
  return best ? { point: best.point, guide: best.guide } : { point: angleSnapped, guide: null };
}
