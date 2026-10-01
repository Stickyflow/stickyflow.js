import type { Point, Rect } from '../types';

const DEGREES_TO_RADIANS = Math.PI / 180;

function rotatePoint(point: Point, degrees: number): Point {
  const radians = degrees * DEGREES_TO_RADIANS;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine };
}

function boundsCenter(bounds: Rect): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function worldToLocal(bounds: Rect, worldPoint: Point): Point {
  const center = boundsCenter(bounds);
  const relativePoint = { x: worldPoint.x - center.x, y: worldPoint.y - center.y };
  return bounds.rotation ? rotatePoint(relativePoint, -bounds.rotation) : relativePoint;
}

export function localToWorld(bounds: Rect, localPoint: Point): Point {
  const center = boundsCenter(bounds);
  const point = bounds.rotation ? rotatePoint(localPoint, bounds.rotation) : localPoint;
  return { x: center.x + point.x, y: center.y + point.y };
}
