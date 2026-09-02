import type { Emitter } from '../events';
import { pointerUserY } from './coordinates';
import { updateChartValuePreview } from './preview';
import { valueAtPixel } from './scale';
import { resolveChartValueDrag } from './target';
import type { ChartValueDragState } from './types';

export class ChartValueDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: ChartValueDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolveChartValueDrag(this.#svg, event);
    return this.#drag !== null;
  }

  move(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    this.#drag.moved = true;
    const value = valueAtPixel(pointerUserY(this.#svg, event), this.#drag.scale);
    updateChartValuePreview(this.#drag, value);
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
    this.#emitter.emit('chartValueChange', {
      owner: drag.owner,
      series: drag.series,
      index: drag.index,
      value: valueAtPixel(pointerUserY(this.#svg, event), drag.scale),
    });
  }
}
