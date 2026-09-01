import { isCameraGesture } from '../domContract';
import type { Viewer } from '../viewer';
import type { Emitter } from './events';
import { createDuplicatePreviewPath, updateDuplicatePreview } from './quickDuplicate/preview';
import { createQuickDuplicateDragState, type QuickDuplicateDragState } from './quickDuplicate/state';
import { resolveDuplicateTarget } from './quickDuplicate/target';

export interface QuickDuplicateHandle {
  destroy(): void;
}

const SCREEN_DRAG_THRESHOLD = 3;

function pointerPosition(svg: SVGSVGElement, event: PointerEvent): { x: number; y: number } {
  const transform = svg.getScreenCTM();
  if (!transform) {
    return { x: 0, y: 0 };
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  return { x: point.x, y: point.y };
}

function crossedDragThreshold(drag: QuickDuplicateDragState, event: PointerEvent): boolean {
  return Math.hypot(event.clientX - drag.startScreen.x, event.clientY - drag.startScreen.y) >= SCREEN_DRAG_THRESHOLD;
}

export function bindQuickDuplicate(viewer: Viewer, emitter: Emitter): QuickDuplicateHandle {
  const svg = viewer.svg;
  let drag: QuickDuplicateDragState | null = null;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || drag || isCameraGesture(event)) {
      return;
    }
    drag = createQuickDuplicateDragState(svg, event, createDuplicatePreviewPath());
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.moved && !crossedDragThreshold(drag, event)) {
      return;
    }
    if (!drag.moved) {
      drag.moved = true;
      svg.appendChild(drag.previewPath);
    }

    const target = resolveDuplicateTarget(drag, pointerPosition(svg, event));
    updateDuplicatePreview(drag, target.point, target.side);
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    const completed = drag;
    drag = null;
    (event.target as Element).releasePointerCapture?.(completed.pointerId);
    completed.previewPath.remove();

    if (!completed.moved) {
      emitter.emit('quickDuplicate', { owner: completed.sourceOwner, direction: completed.direction });
      return;
    }
    if (!completed.hit) {
      return;
    }
    emitter.emit('linkTo', {
      owner: completed.sourceOwner,
      direction: completed.direction,
      target: completed.hit.owner,
      side: completed.hit.side,
      fraction: Math.round(completed.hit.offset * 100) / 100,
    });
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);

  return {
    destroy() {
      drag?.previewPath.remove();
      drag = null;
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
    },
  };
}
