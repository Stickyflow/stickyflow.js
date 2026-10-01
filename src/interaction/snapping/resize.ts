import type { Rect } from '../../model/geometry/types';
import type { EdgePoint, SnapResult } from './types';

export function resizeActivePoints(axisMove: 'left' | 'right' | 'top' | 'bottom' | 'none'): EdgePoint[] {
  if (axisMove === 'none') {
    return [];
  }
  return axisMove === 'left' || axisMove === 'top' ? ['min'] : ['max'];
}

export function applyAxisSnap(
  bounds: Rect,
  moveX: 'left' | 'right' | 'none',
  moveY: 'top' | 'bottom' | 'none',
  snap: SnapResult,
  minSize: number,
): Rect {
  let { x, y, width, height } = bounds;
  if (moveX === 'left' && snap.x.delta) {
    x += snap.x.delta;
    width -= snap.x.delta;
  } else if (moveX === 'right' && snap.x.delta) {
    width += snap.x.delta;
  }
  if (moveY === 'top' && snap.y.delta) {
    y += snap.y.delta;
    height -= snap.y.delta;
  } else if (moveY === 'bottom' && snap.y.delta) {
    height += snap.y.delta;
  }
  return { x, y, width: Math.max(minSize, width), height: Math.max(minSize, height) };
}
