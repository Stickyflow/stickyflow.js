import type { Point, Rect, Side } from '../types';
import { rectanglePointToWorld, worldPointToRectangle } from './rectangleCoordinates';
import type { Port } from './types';

function portPointInRectangle(rectangle: Rect, port: Port): Point {
  const offset = Math.max(0, Math.min(1, port.offset));
  const halfWidth = rectangle.width / 2;
  const halfHeight = rectangle.height / 2;
  switch (port.side) {
    case 'top':
      return { x: (offset - 0.5) * rectangle.width, y: -halfHeight };
    case 'right':
      return { x: halfWidth, y: (offset - 0.5) * rectangle.height };
    case 'bottom':
      return { x: (offset - 0.5) * rectangle.width, y: halfHeight };
    case 'left':
      return { x: -halfWidth, y: (offset - 0.5) * rectangle.height };
  }
}

export function pointAtPort(rectangle: Rect, port: Port): Point {
  return rectanglePointToWorld(rectangle, portPointInRectangle(rectangle, port));
}

export function pointAtNormalizedPort(rectangle: Rect, normalizedPosition: [number, number]): Point {
  return rectanglePointToWorld(rectangle, {
    x: (normalizedPosition[0] - 0.5) * rectangle.width,
    y: (normalizedPosition[1] - 0.5) * rectangle.height,
  });
}

export function relativeOffsetOnRectangleSide(rectangle: Rect, side: Side, worldPoint: Point): number {
  const rectanglePoint = worldPointToRectangle(rectangle, worldPoint);
  switch (side) {
    case 'top':
    case 'bottom':
      return (rectanglePoint.x + rectangle.width / 2) / rectangle.width;
    case 'left':
    case 'right':
      return (rectanglePoint.y + rectangle.height / 2) / rectangle.height;
  }
}
