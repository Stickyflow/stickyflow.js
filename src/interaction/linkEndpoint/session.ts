import { isCameraGesture } from '../../domContract';
import type { Emitter } from '../events';
import { completeLinkEndpointDrag } from './completion';
import { crossedEndpointDragThreshold, endpointPointerPosition } from './pointer';
import { updateEndpointPreview } from './preview';
import { createLinkEndpointDragState, type LinkEndpointDragState } from './state';
import { resolveEndpointTarget } from './target';

export class LinkEndpointSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: LinkEndpointDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag || isCameraGesture(event)) {
      return;
    }

    this.#drag = createLinkEndpointDragState(this.#svg, event);
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (!drag.moved && !crossedEndpointDragThreshold(drag, event)) {
      return;
    }

    drag.moved = true;
    const target = resolveEndpointTarget(drag, endpointPointerPosition(this.#svg, event));
    updateEndpointPreview(drag, target.point, target.side);
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    this.#drag = null;
    (event.target as Element).releasePointerCapture?.(drag.pointerId);
    completeLinkEndpointDrag(this.#emitter, drag);
  };

  cancel(): void {
    this.#drag = null;
  }
}
