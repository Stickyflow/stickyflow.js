import type { Rect } from '../../../model/geometry/types';
import type { DraggedCanvasObject } from './types';

export function offsetBounds(bounds: Rect, dx: number, dy: number): Rect {
  return {
    x: bounds.x + dx,
    y: bounds.y + dy,
    width: bounds.width,
    height: bounds.height,
  };
}

export function clampMoveDelta(
  canvasObjects: DraggedCanvasObject[],
  dx: number,
  dy: number,
): { dx: number; dy: number } {
  let minDx = Number.NEGATIVE_INFINITY;
  let maxDx = Number.POSITIVE_INFINITY;
  let minDy = Number.NEGATIVE_INFINITY;
  let maxDy = Number.POSITIVE_INFINITY;
  for (const canvasObject of canvasObjects) {
    const container = canvasObject.containerBounds;
    if (!container) {
      continue;
    }
    const bounds = canvasObject.draggedBounds;
    minDx = Math.max(minDx, container.x - bounds.x);
    maxDx = Math.min(maxDx, container.x + container.width - (bounds.x + bounds.width));
    minDy = Math.max(minDy, container.y - bounds.y);
    maxDy = Math.min(maxDy, container.y + container.height - (bounds.y + bounds.height));
  }
  return {
    dx: minDx <= maxDx ? Math.min(Math.max(dx, minDx), maxDx) : dx,
    dy: minDy <= maxDy ? Math.min(Math.max(dy, minDy), maxDy) : dy,
  };
}
