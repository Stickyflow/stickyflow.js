import type { Bounds } from '../../model/geometry/router';

export function offsetBounds(bounds: Bounds, dx: number, dy: number): Bounds {
  return {
    x: bounds.x + dx,
    y: bounds.y + dy,
    width: bounds.width,
    height: bounds.height,
  };
}
