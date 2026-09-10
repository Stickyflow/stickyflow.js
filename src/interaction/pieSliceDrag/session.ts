import type { Emitter } from '../events';
import { pieBoundaryValueAt } from './boundary';
import { updatePieSliceDragPreview } from './preview';
import { pointerAngle, resolvePieSliceDrag } from './target';
import type { PieSliceDragState } from './types';

export class PieSliceDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: PieSliceDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolvePieSliceDrag(this.#svg, event);
    return this.#drag !== null;
  }

  move(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const angle = pointerAngle(this.#svg, event, this.#drag);
    if (angle === null) {
      return;
    }
    const split = pieBoundaryValueAt(this.#drag.boundary, angle, this.#drag.lastSplit?.boundary);
    this.#drag.moved = true;
    this.#drag.lastSplit = split;
    updatePieSliceDragPreview(this.#svg, this.#drag, split);
  }

  cancel(): void {
    this.#drag = null;
  }

  finish(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const drag = this.#drag;
    this.#drag = null;
    (event.target as Element)?.releasePointerCapture?.(drag.pointerId);
    if (!drag.moved) {
      return;
    }
    const angle = pointerAngle(this.#svg, event, drag);
    const split = angle === null ? drag.lastSplit : pieBoundaryValueAt(drag.boundary, angle, drag.lastSplit?.boundary);
    if (!split) {
      return;
    }
    this.#emitter.emit('chartValueChange', {
      owner: drag.owner,
      series: drag.boundary.before.seriesId,
      index: 0,
      value: split.beforeValue,
    });
    this.#emitter.emit('chartValueChange', {
      owner: drag.owner,
      series: drag.boundary.after.seriesId,
      index: 0,
      value: split.afterValue,
    });
  }
}
