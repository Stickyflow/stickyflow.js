import { clearAlignmentGuides, isCameraGesture, updateAlignmentGuides } from '../../dom';
import type { Emitter } from '../events';
import { emitResizeCompletion } from './completion';
import { clampResizeToChildren, keepsProportions, lockAspect } from './geometry';
import { resizePointerPosition } from './pointer';
import { applyResizePreview } from './preview';
import { snapResize } from './snapping';
import { createResizeDragState, type ResizeDragState } from './state';

const RESIZE_GUIDE_COLOR = '#4CAF50';

export class ResizeSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: ResizeDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag || isCameraGesture(event)) {
      return;
    }

    this.#drag = createResizeDragState(this.#svg, event);
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    drag.moved = true;
    const snapped = snapResize(this.#svg, drag, resizePointerPosition(this.#svg, event));
    const bounds = keepsProportions(drag, event.shiftKey)
      ? lockAspect(snapped.bounds, drag.startBounds, drag.handle)
      : snapped.bounds;
    const { guides } = snapped;
    applyResizePreview(drag, clampResizeToChildren(bounds, drag.childrenBounds));
    updateAlignmentGuides(this.#svg, guides, RESIZE_GUIDE_COLOR);
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    this.#drag = null;
    (event.target as Element | null)?.releasePointerCapture?.(drag.pointerId);
    clearAlignmentGuides(this.#svg);
    if (!drag.moved) {
      return;
    }

    const snapped = snapResize(this.#svg, drag, resizePointerPosition(this.#svg, event)).bounds;
    const bounds = keepsProportions(drag, event.shiftKey)
      ? lockAspect(snapped, drag.startBounds, drag.handle)
      : snapped;
    emitResizeCompletion(this.#emitter, drag, clampResizeToChildren(bounds, drag.childrenBounds));
  };

  cancel(): void {
    this.#drag = null;
  }
}
