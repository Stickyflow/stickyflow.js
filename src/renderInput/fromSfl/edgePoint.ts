import type { Point } from '../../model/geometry/types';
import type { PositionedElement } from './types';

export function elementCenter(element: PositionedElement): Point {
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
}

export function edgePointToward(element: PositionedElement, other: PositionedElement): Point {
  const center = elementCenter(element);
  const otherCenter = elementCenter(other);
  const angle = Math.atan2(otherCenter.y - center.y, otherCenter.x - center.x);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return { x: element.x + element.width, y: center.y };
  }
  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return { x: center.x, y: element.y + element.height };
  }
  if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) {
    return { x: center.x, y: element.y };
  }
  return { x: element.x, y: center.y };
}
