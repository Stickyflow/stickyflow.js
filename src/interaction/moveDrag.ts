import { clearAlignmentGuides, isCameraGesture, updateAlignmentGuides } from '../domContract';
import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { applyMovePreview } from './move/preview';
import { snapMove } from './move/snapping';
import { createMoveDragState, type MoveDragState } from './move/state';

export interface MoveDragHandle {
  destroy(): void;
}

const SCREEN_DRAG_THRESHOLD = 3;
const MOVE_GUIDE_COLOR = '#8b5cf6';

function pointerPosition(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return { x: 0, y: 0 };
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  return { x: point.x, y: point.y };
}

function crossedDragThreshold(drag: MoveDragState, event: PointerEvent): boolean {
  return Math.hypot(event.clientX - drag.startScreen.x, event.clientY - drag.startScreen.y) >= SCREEN_DRAG_THRESHOLD;
}

function rawDelta(svg: SVGSVGElement, drag: MoveDragState, event: PointerEvent): { dx: number; dy: number } {
  const point = pointerPosition(svg, event);
  return { dx: point.x - drag.startUser.x, dy: point.y - drag.startUser.y };
}

export function bindShapeMovement(viewer: Viewer, emitter: Emitter): MoveDragHandle {
  const svg = viewer.svg;
  let drag: MoveDragState | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || drag || isCameraGesture(event)) {
      return;
    }
    drag = createMoveDragState(viewer, event, pointerPosition(svg, event));
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.moved && !crossedDragThreshold(drag, event)) {
      return;
    }

    drag.moved = true;
    const raw = rawDelta(svg, drag, event);
    const delta = snapMove(svg, drag, raw.dx, raw.dy);
    applyMovePreview(drag, delta.dx, delta.dy);
    updateAlignmentGuides(svg, delta.guides, MOVE_GUIDE_COLOR);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    const completed = drag;
    drag = null;
    (event.target as Element).releasePointerCapture?.(completed.pointerId);
    clearAlignmentGuides(svg);
    if (!completed.moved) {
      return;
    }

    const raw = rawDelta(svg, completed, event);
    const { dx, dy } = snapMove(svg, completed, raw.dx, raw.dy);
    for (const entity of completed.entities) {
      emitter.emit('moveChange', { owner: entity.owner, dx, dy });
    }
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);

  return {
    destroy() {
      drag = null;
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
    },
  };
}
