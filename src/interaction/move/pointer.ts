import type { MoveDragState } from './state';

const SCREEN_DRAG_THRESHOLD = 3;

export function movePointerPosition(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return { x: 0, y: 0 };
  }

  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  return { x: point.x, y: point.y };
}

export function crossedMoveDragThreshold(drag: MoveDragState, event: PointerEvent): boolean {
  const horizontalDistance = event.clientX - drag.startScreen.x;
  const verticalDistance = event.clientY - drag.startScreen.y;
  return Math.hypot(horizontalDistance, verticalDistance) >= SCREEN_DRAG_THRESHOLD;
}

export function movePointerDelta(
  svg: SVGSVGElement,
  drag: MoveDragState,
  event: PointerEvent,
): { dx: number; dy: number } {
  const point = movePointerPosition(svg, event);
  return { dx: point.x - drag.startUser.x, dy: point.y - drag.startUser.y };
}
