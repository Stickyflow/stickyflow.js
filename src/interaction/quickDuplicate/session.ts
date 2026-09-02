import { isCameraGesture } from '../../domContract';
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

    this.#drag = createQuickDuplicateDragState(this.#svg, event, createDuplicatePreviewPath());
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
    const target = resolveDuplicateTarget(drag, duplicatePointerPosition(this.#svg, event));
    updateDuplicatePreview(drag, target.point, target.side);
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    this.#drag = null;
    (event.target as Element).releasePointerCapture?.(drag.pointerId);
    drag.previewPath.remove();
    emitQuickDuplicateCompletion(this.#emitter, drag);
  };

  cancel(): void {
    this.#drag?.previewPath.remove();
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
