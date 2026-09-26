import { pointerUserPoint } from '../../domContract';
import { seriesLabelPulledProp } from '../../rendering/charts/propPath';
import type { Emitter } from '../events';
import { clearPieLabelDragPreview, updatePieLabelDragPreview } from './preview';
import { resolvePieLabelDrag } from './target';
import type { PieLabelDragState } from './types';

const PULL_THRESHOLD = 14;
const MOVE_NOISE = 2;

export class PieLabelDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: PieLabelDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolvePieLabelDrag(this.#svg, event);
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
    const distance = Math.hypot(point.x - drag.centerX, point.y - drag.centerY);
    drag.pulled = distance > drag.outerRadius + PULL_THRESHOLD;
    updatePieLabelDragPreview(drag, dx, dy);
  }

  cancel(): void {
    if (this.#drag) {
      clearPieLabelDragPreview(this.#drag);
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
    clearPieLabelDragPreview(drag);
    if (!drag.moved) {
      return;
    }
    const path = seriesLabelPulledProp(drag.seriesId);
    if (!path) {
      return;
    }
    this.#emitter.emit('propertyChange', { owner: drag.owner, path, value: drag.pulled });
  }
}
