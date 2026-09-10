import { pointerUserPoint } from '../../domContract';
import { radarValueAtPoint, radarVertexPoint } from '../../rendering/charts/primitives/radarShape';
import type { Emitter } from '../events';
import { updateRadarVertexDragPreview } from './preview';
import { createValueReadout, positionRadarReadout, removeValueReadout } from './readout';
import { resolveRadarVertexDrag } from './target';
import type { RadarVertexDragState } from './types';

function valueFrom(svg: SVGSVGElement, event: PointerEvent, drag: RadarVertexDragState): number | null {
  const point = pointerUserPoint(svg, event);
  if (!point) {
    return null;
  }
  return radarValueAtPoint(drag.frame, drag.index, point.x, point.y);
}

export class RadarVertexDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: RadarVertexDragState | null = null;
  #readout: SVGGElement | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolveRadarVertexDrag(this.#svg, event);
    return this.#drag !== null;
  }

  move(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const value = valueFrom(this.#svg, event, this.#drag);
    if (value === null) {
      return;
    }
    this.#drag.moved = true;
    this.#drag.lastValue = value;
    updateRadarVertexDragPreview(this.#svg, this.#drag, value);

    if (!this.#readout) {
      this.#readout = createValueReadout(this.#svg);
    }
    const vertex = radarVertexPoint(this.#drag.frame, this.#drag.index, value);
    positionRadarReadout(this.#readout, vertex, this.#drag.frame.centerY, value);
  }

  cancel(): void {
    this.#drag = null;
    removeValueReadout(this.#readout);
    this.#readout = null;
  }

  finish(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const drag = this.#drag;
    this.#drag = null;
    removeValueReadout(this.#readout);
    this.#readout = null;
    (event.target as Element)?.releasePointerCapture?.(drag.pointerId);
    if (!drag.moved) {
      return;
    }
    const value = valueFrom(this.#svg, event, drag) ?? drag.lastValue;
    if (value === null) {
      return;
    }
    this.#emitter.emit('chartValueChange', {
      owner: drag.owner,
      series: drag.series,
      index: drag.index,
      value,
    });
  }
}
