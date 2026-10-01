import { pointerUserPoint } from '../../domContract';
import { seriesLabelOffsetXProp, seriesLabelOffsetYProp } from '../../rendering/charts/propPath';
import type { Emitter } from '../events';
import { clearPieLabelDragPreview, updatePieLabelDragPreview } from './preview';
import { resolvePieLabelDrag } from './target';
import type { PieLabelDragState } from './types';

const PULL_THRESHOLD = 14;
const MOVE_NOISE = 2;
const MAX_PULL_FACTOR = 1.5;

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
    drag.lastDx = dx;
    drag.lastDy = dy;
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
    const pathX = seriesLabelOffsetXProp(drag.seriesId);
    const pathY = seriesLabelOffsetYProp(drag.seriesId);
    if (!pathX || !pathY) {
      return;
    }
    const newX = drag.restX + drag.lastDx;
    const newY = drag.restY + drag.lastDy;
    const distanceFromCenter = Math.hypot(newX - drag.centerX, newY - drag.centerY);
    const pulled = distanceFromCenter > drag.outerRadius + PULL_THRESHOLD;
    const maxOffset = drag.outerRadius * MAX_PULL_FACTOR;
    const offsetX = pulled ? clampOffset(newX - drag.anchorX, maxOffset) : 0;
    const offsetY = pulled ? clampOffset(newY - drag.anchorY, maxOffset) : 0;
    this.#emitter.emit('propertyChange', { owner: drag.owner, path: pathX, value: Math.round(offsetX) });
    this.#emitter.emit('propertyChange', { owner: drag.owner, path: pathY, value: Math.round(offsetY) });
  }
}

function clampOffset(value: number, max: number): number {
  return Math.max(-max, Math.min(max, value));
}
