import { clearAlignmentGuides, isCameraGesture, updateAlignmentGuides } from '../../dom';
import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import { emitMoveCompletion } from './completion';
import { clampMoveDelta } from './geometry';
import { crossedMoveDragThreshold, movePointerDelta, movePointerPosition } from './pointer';
import { applyMovePreview } from './preview';
import { snapMove } from './snapping';
import { createMoveDragState, type MoveDragState } from './state';

const MOVE_GUIDE_COLOR = '#8b5cf6';

export class MoveSession {
  readonly #viewer: Viewer;
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: MoveDragState | null = null;

  constructor(viewer: Viewer, emitter: Emitter) {
    this.#viewer = viewer;
    this.#svg = viewer.svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag || isCameraGesture(event)) {
      return;
    }

    this.#drag = createMoveDragState(this.#viewer, event, movePointerPosition(this.#svg, event));
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.moved && !crossedMoveDragThreshold(drag, event)) {
      return;
    }

    drag.moved = true;
    const rawDelta = movePointerDelta(this.#svg, drag, event);
    const delta = snapMove(this.#svg, drag, rawDelta.dx, rawDelta.dy);
    const clamped = clampMoveDelta(drag.entities, delta.dx, delta.dy);
    applyMovePreview(drag, clamped.dx, clamped.dy);
    updateAlignmentGuides(this.#svg, delta.guides, MOVE_GUIDE_COLOR);
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    this.#drag = null;
    (event.target as Element).releasePointerCapture?.(drag.pointerId);
    clearAlignmentGuides(this.#svg);
    emitMoveCompletion(this.#svg, this.#emitter, drag, event);
  };

  cancel(): void {
    this.#drag = null;
  }
}
