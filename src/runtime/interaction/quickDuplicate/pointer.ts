import type { QuickDuplicateDragState } from './state';

const SCREEN_DRAG_THRESHOLD = 3;

export function duplicatePointerPosition(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return { x: 0, y: 0 };
  }

  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  return { x: point.x, y: point.y };
}

export function crossedDuplicateDragThreshold(drag: QuickDuplicateDragState, event: PointerEvent): boolean {
  const horizontalDistance = event.clientX - drag.startScreen.x;
  const verticalDistance = event.clientY - drag.startScreen.y;
  return Math.hypot(horizontalDistance, verticalDistance) >= SCREEN_DRAG_THRESHOLD;
}
