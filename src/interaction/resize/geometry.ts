import type { ResizeHandle } from '../../domContract';
import type { Rect } from '../../model/geometry/types';
import { minHeightForText, minWidthForText, type TextFit } from './textFit';

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

export function resizedBounds(start: Rect, handle: ResizeHandle, pointer: { x: number; y: number }): Rect {
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

export interface BoundsInset {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const NO_INSET: BoundsInset = { left: 0, top: 0, right: 0, bottom: 0 };

export function insetWithin(outer: Rect, inner: Rect): BoundsInset {
  return {
    left: inner.x - outer.x,
    top: inner.y - outer.y,
    right: outer.x + outer.width - (inner.x + inner.width),
    bottom: outer.y + outer.height - (inner.y + inner.height),
  };
}

export function applyInset(bounds: Rect, inset: BoundsInset): Rect {
  return {
    x: bounds.x + inset.left,
    y: bounds.y + inset.top,
    width: Math.max(1, bounds.width - inset.left - inset.right),
    height: Math.max(1, bounds.height - inset.top - inset.bottom),
  };
}

export function keepTextInside(bounds: Rect, start: Rect, handle: ResizeHandle, fit: TextFit | null): Rect {
  if (!fit) {
    return bounds;
  }
  const axes = HANDLE_AXES[handle];
  const width = axes.x === 'none' ? bounds.width : Math.max(bounds.width, Math.min(minWidthForText(fit), start.width));
  const height =
    axes.y === 'none' ? bounds.height : Math.max(bounds.height, Math.min(minHeightForText(fit, width), start.height));
  const fixedX = axes.x === 'left' ? start.x + start.width : start.x;
  const fixedY = axes.y === 'top' ? start.y + start.height : start.y;
  return {
    x: axes.x === 'none' || Math.abs(bounds.x - fixedX) < 1e-6 ? bounds.x : fixedX - width,
    y: axes.y === 'none' || Math.abs(bounds.y - fixedY) < 1e-6 ? bounds.y : fixedY - height,
    width,
    height,
  };
}

export function lockDerivedHeight(bounds: Rect, start: Rect, locked: boolean): Rect {
  return locked ? { ...bounds, y: start.y, height: start.height } : bounds;
}

export function clampResizeToChildren(bounds: Rect, childrenBounds: Rect | undefined): Rect {
  if (!childrenBounds) {
    return bounds;
  }
  const minX = Math.min(bounds.x, childrenBounds.x);
  const minY = Math.min(bounds.y, childrenBounds.y);
  const maxX = Math.max(bounds.x + bounds.width, childrenBounds.x + childrenBounds.width);
  const maxY = Math.max(bounds.y + bounds.height, childrenBounds.y + childrenBounds.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
