import type { Emitter } from '../events';
import { pointerAlongValueAxis } from './coordinates';
import { type BarOrigin, updateBarLabel, updateChartValuePreview } from './preview';
import { createValueReadout, markAnchorX, markAnchorY, removeValueReadout, updateValueReadout } from './readout';
import { valueAtPixel } from './scale';
import { resolveChartValueDrag } from './target';
import type { ChartValueDragState } from './types';

export class ChartValueDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: ChartValueDragState | null = null;
  #readout: SVGGElement | null = null;
  #origin: BarOrigin | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  #endPreview(drag: ChartValueDragState): void {
    if (drag.moved) {
      this.#emitter.emit('chartValuePreview', {
        owner: drag.owner,
        series: drag.series,
        index: drag.index,
        value: null,
      });
    }
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolveChartValueDrag(this.#svg, event);
    if (this.#drag?.isBar) {
      const box = this.#drag.element.getBBox();
      this.#origin = { top: box.y, height: box.height, left: box.x, width: box.width };
    }
    return this.#drag !== null;
  }

  move(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    this.#drag.moved = true;
    const value = valueAtPixel(pointerAlongValueAxis(this.#svg, event, this.#drag.scale.horizontal), this.#drag.scale);
    updateChartValuePreview(this.#svg, this.#drag, value);

    this.#emitter.emit('chartValuePreview', {
      owner: this.#drag.owner,
      series: this.#drag.series,
      index: this.#drag.index,
      value,
    });

    if (this.#origin && updateBarLabel(this.#svg, this.#drag, this.#origin, value)) {
      return;
    }
    if (!this.#readout) {
      this.#readout = createValueReadout(this.#svg);
    }
    updateValueReadout(
      this.#readout,
      { centerX: markAnchorX(this.#drag), centerY: markAnchorY(this.#drag), scale: this.#drag.scale },
      value,
    );
  }

  cancel(): void {
    if (this.#drag) {
      this.#endPreview(this.#drag);
    }
    this.#drag = null;
    this.#origin = null;
    removeValueReadout(this.#readout);
    this.#readout = null;
  }

  finish(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const drag = this.#drag;
    this.#drag = null;
    this.#origin = null;
    removeValueReadout(this.#readout);
    this.#readout = null;
    (event.target as Element)?.releasePointerCapture?.(drag.pointerId);
    if (!drag.moved) {
      return;
    }
    this.#emitter.emit('chartValueChange', {
      owner: drag.owner,
      series: drag.series,
      index: drag.index,
      value: valueAtPixel(pointerAlongValueAxis(this.#svg, event, drag.scale.horizontal), drag.scale),
    });
    this.#endPreview(drag);
  }
}
