import { portToPoint, projectOffsetOnSide, type Rect, type Side } from '../../model/geometry/router';

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

export function nearestPort(bounds: Rect, point: { x: number; y: number }): { side: Side; offset: number } {
  let nearest = { side: 'right' as Side, offset: 0.5 };
  let nearestDistance = Infinity;

  for (const side of SIDES) {
    const offset = Math.max(0, Math.min(1, projectOffsetOnSide(bounds, side, point)));
    const candidate = portToPoint(bounds, { side, offset });
    const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = { side, offset };
    }
  }
  return nearest;
}

export function sideFromDirection(from: { x: number; y: number }, to: { x: number; y: number }): Side {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return 'right';
  }
  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return 'bottom';
  }
  if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) {
    return 'top';
  }
  return 'left';
}
