import { AXIS_COS, AXIS_SIN } from '../../../model/isometricObject';
import { isCameraGesture, pointerUserPoint } from '../../dom';
import type { Emitter } from '../events';
import { updateLiveFaceLinks } from '../linkPreview';
import { readIsometricSnapStep, snapToStep } from '../snapGrid';
import { applyIsometricAxisPreview } from './preview';
import { createIsometricAxisDragState, type IsometricAxisDragState, type IsometricObjectSize } from './state';

const MIN_SIZE = 10;

function nextGeometry(
  drag: IsometricAxisDragState,
  point: { x: number; y: number },
  step: number | null,
): IsometricObjectSize {
  const { start, axis } = drag;
  const length = (value: number, min: number): number => (step ? snapToStep(value, step, step) : Math.max(min, value));
  const dx = point.x - drag.startUser.x;
  const dy = point.y - drag.startUser.y;

  if (axis === 'width') {
    const delta = dx * AXIS_COS + dy * AXIS_SIN;
    return { ...start, width: length(start.width + delta, MIN_SIZE) };
  }
  if (axis === 'height') {
    return { ...start, height: length(start.height + dy, MIN_SIZE) };
  }
  const delta = -dx * AXIS_COS + dy * AXIS_SIN;
  const depth = length(start.depth + delta, 0);
  const x = start.x + (start.depth - depth) * AXIS_COS;
  return { ...start, x, depth };
}

export class IsometricAxisResizeSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: IsometricAxisDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag || isCameraGesture(event)) {
      return;
    }
    this.#drag = createIsometricAxisDragState(this.#svg, event);
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const point = pointerUserPoint(this.#svg, event);
    if (!point) {
      return;
    }
    drag.moved = true;
    drag.current = nextGeometry(drag, point, readIsometricSnapStep(this.#svg));
    updateLiveFaceLinks(drag.liveFaceLinks, drag.current);
    applyIsometricAxisPreview(
      drag.nodes,
      drag.current,
      drag.cornerRadius,
      { halo: drag.overlayHalo, arrows: drag.overlayArrows },
      this.#svg,
    );
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    this.#drag = null;
    (event.target as Element | null)?.releasePointerCapture?.(drag.pointerId);
    if (drag.overlayDuplicateBubbles) {
      drag.overlayDuplicateBubbles.style.display = '';
    }
    if (!drag.moved) {
      return;
    }
    const next = drag.current;
    this.#emitter.emit('resizeChange', {
      owner: drag.owner,
      dx: 0,
      dy: 0,
      dWidth: next.width - drag.start.width,
      dHeight: next.height - drag.start.height,
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
      depth: next.depth,
    });
  };

  cancel(): void {
    if (this.#drag?.overlayDuplicateBubbles) {
      this.#drag.overlayDuplicateBubbles.style.display = '';
    }
    this.#drag = null;
  }
}
