import { pointerUserY } from '../chartValue/coordinates';
import { createValueReadout, removeValueReadout, updateValueReadout } from '../chartValue/readout';
import { pixelForValue, valueAtPixel } from '../chartValue/scale';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { type PropertyDragTarget, resolvePropertyDrag } from './target';

export class PropertyDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  readonly #rules: EditableRules | undefined;
  #drag: PropertyDragTarget | null = null;
  #startY = 0;
  #readout: SVGGElement | null = null;
  #moved = false;

  constructor(svg: SVGSVGElement, emitter: Emitter, rules: EditableRules | undefined) {
    this.#svg = svg;
    this.#emitter = emitter;
    this.#rules = rules;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    const drag = resolvePropertyDrag(this.#svg, event, this.#rules);
    if (!drag) {
      return false;
    }
    this.#drag = drag;
    this.#startY = pixelForValue(valueAtPixel(pointerUserY(this.#svg, event), drag.scale), drag.scale);
    this.#moved = false;
    return true;
  }

  move(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    this.#moved = true;

    const value = valueAtPixel(pointerUserY(this.#svg, event), this.#drag.scale);
    const offset = pixelForValue(value, this.#drag.scale) - this.#startY;
    for (const node of this.#drag.nodes) {
      node.setAttribute('transform', `translate(0 ${offset})`);
    }

    if (!this.#readout) {
      this.#readout = createValueReadout(this.#svg);
    }
    updateValueReadout(this.#readout, { centerX: this.#centerX(), scale: this.#drag.scale }, value);
  }

  cancel(): void {
    this.#clearPreview();
    this.#drag = null;
  }

  finish(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const drag = this.#drag;
    const moved = this.#moved;
    this.#clearPreview();
    this.#drag = null;
    (event.target as Element)?.releasePointerCapture?.(drag.pointerId);
    if (!moved) {
      return;
    }
    this.#emitter.emit('propertyChange', {
      owner: drag.owner,
      path: drag.path,
      value: valueAtPixel(pointerUserY(this.#svg, event), drag.scale),
    });
  }

  #centerX(): number {
    const plot = this.#drag?.nodes[0]?.getBBox?.();
    return plot ? plot.x + plot.width / 2 : 0;
  }

  #clearPreview(): void {
    for (const node of this.#drag?.nodes ?? []) {
      node.removeAttribute('transform');
    }
    removeValueReadout(this.#readout);
    this.#readout = null;
  }
}
