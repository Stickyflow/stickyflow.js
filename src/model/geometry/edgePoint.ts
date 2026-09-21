import type { Point } from './types';

export interface BoxLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function elementCenter(rect: BoxLike): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function edgePointToward(rect: BoxLike, other: BoxLike): Point {
  const center = elementCenter(rect);
  const otherCenter = elementCenter(other);
  const angle = Math.atan2(otherCenter.y - center.y, otherCenter.x - center.x);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return { x: rect.x + rect.width, y: center.y };
  }
  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return { x: center.x, y: rect.y + rect.height };
  }
  if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) {
    return { x: center.x, y: rect.y };
  }
  return { x: rect.x, y: center.y };
}
