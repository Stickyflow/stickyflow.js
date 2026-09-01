import type { Rect } from '../../model/geometry/router';

export function offsetBounds(bounds: Rect, dx: number, dy: number): Rect {
  return {
    x: bounds.x + dx,
    y: bounds.y + dy,
    width: bounds.width,
    height: bounds.height,
  };
}
