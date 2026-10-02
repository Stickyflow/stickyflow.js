import { isCameraGesture, pointerUserPoint } from '../../dom';
import type { Emitter } from '../events';
import { applyPathReshapePreview } from './preview';
import { createPathReshapeDragState, type PathReshapeDragState } from './state';

export class PathReshapeSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: PathReshapeDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag || isCameraGesture(event)) {
      return;
    }
    this.#drag = createPathReshapeDragState(this.#svg, event);
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    drag.moved = true;
    const point = pointerUserPoint(this.#svg, event);
    if (point) {
      applyPathReshapePreview(drag, point);
    }
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    this.#drag = null;
    (event.target as Element | null)?.releasePointerCapture?.(drag.pointerId);
    if (!drag.moved) {
      return;
    }
    const point = pointerUserPoint(this.#svg, event) ?? {
      x: drag.points[drag.pointIndex][0],
      y: drag.points[drag.pointIndex][1],
    };
    const points = applyPathReshapePreview(drag, point);
    this.#emitter.emit('pathPointChange', { owner: drag.owner, points: points.map(([x, y]) => ({ x, y })) });
  };

  cancel(): void {
    this.#drag = null;
  }
}
