import { pointerUserPoint } from '../../dom';
import type { Emitter } from '../events';
import { clearSankeyNodeDragPreview, updateSankeyNodeDragPreview } from './preview';
import { resolveSankeyNodeDrag } from './target';
import type { SankeyNodeDragState } from './types';

const MOVE_NOISE = 2;

export class SankeyNodeDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: SankeyNodeDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolveSankeyNodeDrag(this.#svg, event);
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
    updateSankeyNodeDragPreview(drag, dx, dy);
  }

  cancel(): void {
    if (this.#drag) {
      clearSankeyNodeDragPreview(this.#drag);
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
    clearSankeyNodeDragPreview(drag);
    if (!drag.moved) {
      return;
    }
    this.#emitter.emit('sankeyNodeMove', { owner: drag.owner, nodeId: drag.nodeId, dx: drag.lastDx, dy: drag.lastDy });
  }
}
