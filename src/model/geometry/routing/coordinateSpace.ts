import type { Point } from '../types';
import type { Rect } from './types';

const DEGREES_TO_RADIANS = Math.PI / 180;

function rotatePoint(point: Point, degrees: number): Point {
  const radians = degrees * DEGREES_TO_RADIANS;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

export function boundsCenter(bounds: Rect): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function worldToLocal(bounds: Rect, worldPoint: Point): Point {
  const center = boundsCenter(bounds);
  const relativePoint = {
    x: worldPoint.x - center.x,
    y: worldPoint.y - center.y,
  };

  if (!bounds.rotation) {
    return relativePoint;
  }

  return rotatePoint(relativePoint, -bounds.rotation);
}

export function localToWorld(bounds: Rect, localPoint: Point): Point {
  const center = boundsCenter(bounds);
  if (!bounds.rotation) {
    return {
      x: center.x + localPoint.x,
      y: center.y + localPoint.y,
    };
  }

  const rotatedPoint = rotatePoint(localPoint, bounds.rotation);
  return {
    x: center.x + rotatedPoint.x,
    y: center.y + rotatedPoint.y,
  };
}
