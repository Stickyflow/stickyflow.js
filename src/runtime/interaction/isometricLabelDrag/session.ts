import { pointerUserPoint } from '../../dom';
import type { Emitter } from '../events';
import { clearIsometricLabelDragPreview, updateIsometricLabelDragPreview } from './preview';
import { resolveIsometricLabelDrag } from './target';
import type { IsometricLabelDragState } from './types';

const MOVE_NOISE = 2;

export class IsometricLabelDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: IsometricLabelDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolveIsometricLabelDrag(this.#svg, event);
    return this.#drag !== null;
  }

  move(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const point = pointerUserPoint(this.#svg, event);
    if (!point) {
      return;
    }
    const drag = this.#drag;
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < MOVE_NOISE) {
      return;
    }
    drag.moved = true;
    drag.lastDx = dx;
    drag.lastDy = dy;
    updateIsometricLabelDragPreview(drag, dx, dy);
  }

  cancel(): void {
    if (this.#drag) {
      clearIsometricLabelDragPreview(this.#drag);
    }
    this.#drag = null;
  }

  finish(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const drag = this.#drag;
    this.#drag = null;
    (event.target as Element)?.releasePointerCapture?.(drag.pointerId);
    clearIsometricLabelDragPreview(drag);
    if (!drag.moved) {
      return;
    }
    const offsetX = Math.round(drag.baseOffsetX + drag.lastDx);
    const offsetY = Math.round(drag.baseOffsetY + drag.lastDy);
    this.#emitter.emit('propertyChange', { owner: drag.owner, path: 'style.labelOffsetX', value: offsetX });
    this.#emitter.emit('propertyChange', { owner: drag.owner, path: 'style.labelOffsetY', value: offsetY });
  }
}
