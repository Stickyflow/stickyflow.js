import type { Bounds } from '../../model/geometry/router';
import type { ResizeHandle } from '../../viewer/selectionOverlay';

export const MIN_SIZE = 10;

export const HANDLE_AXES: Record<ResizeHandle, { x: 'left' | 'right' | 'none'; y: 'top' | 'bottom' | 'none' }> = {
  'top-left': { x: 'left', y: 'top' },
  top: { x: 'none', y: 'top' },
  'top-right': { x: 'right', y: 'top' },
  right: { x: 'right', y: 'none' },
  'bottom-right': { x: 'right', y: 'bottom' },
  bottom: { x: 'none', y: 'bottom' },
  'bottom-left': { x: 'left', y: 'bottom' },
  left: { x: 'left', y: 'none' },
};

export function resizedBounds(start: Bounds, handle: ResizeHandle, pointer: { x: number; y: number }): Bounds {
  const axes = HANDLE_AXES[handle];
  let x = start.x,
    width = start.width;
  if (axes.x !== 'none') {
    const fixedX = axes.x === 'left' ? start.x + start.width : start.x;
    const x1 = Math.min(fixedX, pointer.x),
      x2 = Math.max(fixedX, pointer.x);
    x = x1;
    width = Math.max(MIN_SIZE, x2 - x1);
  }
  let y = start.y,
    height = start.height;
  if (axes.y !== 'none') {
    const fixedY = axes.y === 'top' ? start.y + start.height : start.y;
    const y1 = Math.min(fixedY, pointer.y),
      y2 = Math.max(fixedY, pointer.y);
    y = y1;
    height = Math.max(MIN_SIZE, y2 - y1);
  }
  return { x, y, width, height };
}
