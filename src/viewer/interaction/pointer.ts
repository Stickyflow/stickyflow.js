import { isCameraGesture, resolveOwner } from '../../domContract';
import type { DisplayHandle } from '../display';
import type { Emitter } from '../events';
import { emitOwnerHover, selectPointerTarget } from './pointerSelection';
import type { SelectionController } from './selectionController';

const DRAG_THRESHOLD = 4;
const OVERLAY_CONTROL_SELECTOR = '[data-sf-resize-handle], [data-sf-link-endpoint], [data-sf-quick-duplicate]';

interface PointerDownState {
  x: number;
  y: number;
  moved: boolean;
  panable: boolean;
}

function isOverlayControl(target: Element | null): boolean {
  return Boolean(target?.closest(OVERLAY_CONTROL_SELECTOR));
}

export function bindPointerInteraction(
  display: DisplayHandle,
  emitter: Emitter,
  diagramId: string,
  selection: SelectionController,
  selectable: boolean,
): () => void {
  const { svg } = display;
  let down: PointerDownState | null = null;

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Element | null;
    const overContent = Boolean(resolveOwner(target)) || isOverlayControl(target);
    down = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      panable: isCameraGesture(event) || !overContent,
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (down) {
      if (!down.moved && Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_THRESHOLD) {
        down.moved = true;
      }
      if (down.moved) {
        if (down.panable && isCameraGesture(event)) {
          display.panBy(event.movementX, event.movementY);
        }
        return;
      }
    }
    if (!selectable) {
      return;
    }
    emitOwnerHover(event, emitter, diagramId);
  };

  const onPointerUp = (event: PointerEvent) => {
    const wasDrag = down?.moved ?? false;
    down = null;
    if (wasDrag || !selectable) {
      return;
    }
    selectPointerTarget(event, svg, emitter, diagramId, selection, isOverlayControl);
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  return () => {
    svg.removeEventListener('pointerdown', onPointerDown);
    svg.removeEventListener('pointermove', onPointerMove);
    svg.removeEventListener('pointerup', onPointerUp);
  };
}
