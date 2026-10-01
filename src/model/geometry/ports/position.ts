import type { Point, Rect, Side } from '../types';
import { localToWorld, worldToLocal } from './coordinateSpace';
import type { Port } from './types';

function sidePoint(bounds: Rect, port: Port): Point {
  const offset = Math.max(0, Math.min(1, port.offset));
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  switch (port.side) {
    case 'top':
      return { x: (offset - 0.5) * bounds.width, y: -halfHeight };
    case 'right':
      return { x: halfWidth, y: (offset - 0.5) * bounds.height };
    case 'bottom':
      return { x: (offset - 0.5) * bounds.width, y: halfHeight };
    case 'left':
      return { x: -halfWidth, y: (offset - 0.5) * bounds.height };
  }
}

export function portToPoint(bounds: Rect, port: Port): Point {
  return localToWorld(bounds, sidePoint(bounds, port));
}

export function namedPortToPoint(bounds: Rect, position: [number, number]): Point {
  return localToWorld(bounds, {
    x: (position[0] - 0.5) * bounds.width,
    y: (position[1] - 0.5) * bounds.height,
  });
}

export function projectOffsetOnSide(bounds: Rect, side: Side, worldPoint: Point): number {
  const localPoint = worldToLocal(bounds, worldPoint);
  switch (side) {
    case 'top':
    case 'bottom':
      return (localPoint.x + bounds.width / 2) / bounds.width;
    case 'left':
    case 'right':
      return (localPoint.y + bounds.height / 2) / bounds.height;
  }
}
