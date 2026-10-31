import { isCameraGesture, resolveOwner } from '../../dom';
import type { DisplayHandle } from '../display';
import type { Emitter } from '../events';
import { isSelectionOverlayControl, OwnerPointerController } from './pointerSelection';
import type { SelectionController } from './selectionController';

const DRAG_THRESHOLD = 4;
interface PointerDownState {
  x: number;
  y: number;
  moved: boolean;
  panable: boolean;
}

export interface PointerInteractionBinding {
  display: DisplayHandle;
  emitter: Emitter;
  diagramId: string;
  selection: SelectionController;
  selectable: boolean;
}

class PointerInteractionSession {
  readonly #display: DisplayHandle;
  readonly #ownerPointer: OwnerPointerController;
  readonly #selectable: boolean;
  #down: PointerDownState | null = null;

  constructor(display: DisplayHandle, ownerPointer: OwnerPointerController, selectable: boolean) {
    this.#display = display;
    this.#ownerPointer = ownerPointer;
    this.#selectable = selectable;
  }

  bind(): () => void {
    this.#display.svg.addEventListener('pointerdown', this.#onPointerDown);
    this.#display.svg.addEventListener('pointermove', this.#onPointerMove);
    this.#display.svg.addEventListener('pointerup', this.#onPointerUp);
    return () => this.#destroy();
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    const target = event.target as Element | null;
    const overContent = Boolean(resolveOwner(target)) || isSelectionOverlayControl(target);
    this.#down = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      panable: isCameraGesture(event) || !overContent,
    };
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    if (this.#continueDrag(event)) {
      return;
    }
    if (this.#selectable) {
      this.#ownerPointer.hover(event);
    }
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    const wasDrag = this.#down?.moved ?? false;
    this.#down = null;
    // Only the main button selects: the right one opens a menu for what is already selected.
    if (!wasDrag && this.#selectable && event.button === 0) {
      this.#ownerPointer.select(event);
    }
  };

  #continueDrag(event: PointerEvent): boolean {
    if (!this.#down) {
      return false;
    }
    if (!this.#down.moved && Math.hypot(event.clientX - this.#down.x, event.clientY - this.#down.y) > DRAG_THRESHOLD) {
      this.#down.moved = true;
    }
    if (!this.#down.moved) {
      return false;
    }
    if (this.#down.panable && isCameraGesture(event)) {
      this.#display.panBy(event.movementX, event.movementY);
    }
    return true;
  }

  #destroy(): void {
    this.#display.svg.removeEventListener('pointerdown', this.#onPointerDown);
    this.#display.svg.removeEventListener('pointermove', this.#onPointerMove);
    this.#display.svg.removeEventListener('pointerup', this.#onPointerUp);
  }
}

export function bindPointerInteraction(binding: PointerInteractionBinding): () => void {
  const { display, emitter, diagramId, selection, selectable } = binding;
  const ownerPointer = new OwnerPointerController(display.svg, emitter, diagramId, selection);
  return new PointerInteractionSession(display, ownerPointer, selectable).bind();
}
