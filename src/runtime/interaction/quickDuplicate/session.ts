import { isCameraGesture, pxPerUnit } from '../../dom';
import type { Emitter } from '../events';
import { emitQuickDuplicateCompletion } from './completion';
import { crossedDuplicateDragThreshold, duplicatePointerPosition } from './pointer';
import { createDuplicatePreviewPath, updateDuplicatePreview } from './preview';
import { createQuickDuplicateDragState, type QuickDuplicateDragState } from './state';
import { resolveDuplicateTarget } from './target';

export class QuickDuplicateSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: QuickDuplicateDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag || isCameraGesture(event)) {
      return;
    }

    this.#drag = createQuickDuplicateDragState(this.#svg, event, createDuplicatePreviewPath(this.#svg));
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.moved && !crossedDuplicateDragThreshold(drag, event)) {
      return;
    }

    this.beginPreview(drag);
    const target = resolveDuplicateTarget(drag, duplicatePointerPosition(this.#svg, event), 1 / pxPerUnit(this.#svg));
    updateDuplicatePreview(drag, target.point, target.side);
    drag.ghost.show(target.hit !== null, target.bounds);
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    this.#drag = null;
    (event.target as Element).releasePointerCapture?.(drag.pointerId);
    drag.previewPath.remove();
    drag.ghost.hide();
    emitQuickDuplicateCompletion(this.#emitter, drag);
  };

  cancel(): void {
    this.#drag?.previewPath.remove();
    this.#drag?.ghost.hide();
    this.#drag = null;
  }

  private beginPreview(drag: QuickDuplicateDragState): void {
    if (drag.moved) {
      return;
    }

    drag.moved = true;
    this.#svg.appendChild(drag.previewPath);
  }
}
