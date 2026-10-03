import { isCameraGesture, pointerUserPoint } from '../../dom';
import type { Emitter } from '../events';
import { applyIsometricAxisPreview } from './preview';
import { createIsometricAxisDragState, type IsometricAxisDragState, type IsometricObjectSize } from './state';

const MIN_SIZE = 10;

function nextGeometry(drag: IsometricAxisDragState, point: { x: number; y: number }): IsometricObjectSize {
  const { start, axis } = drag;
  const dx = point.x - drag.startUser.x;
  const dy = point.y - drag.startUser.y;

  if (axis === 'width') {
    return { ...start, width: Math.max(MIN_SIZE, start.width + dx) };
  }
  if (axis === 'height') {
    return { ...start, height: Math.max(MIN_SIZE, start.height + dy) };
  }
  const maxDepth = Math.min(start.width / 2, start.height / 2);
  return { ...start, depth: Math.min(maxDepth, Math.max(0, start.depth + dy)) };
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
    drag.current = nextGeometry(drag, point);
    applyIsometricAxisPreview(drag.nodes, drag.current, drag.cornerRadius);
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
    this.#drag = null;
  }
}
