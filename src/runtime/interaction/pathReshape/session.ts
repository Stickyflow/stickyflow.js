import { PATH_POINT_SELECTED_ATTR } from '../../../svg/domContract/attributes';
import { isCameraGesture, pointerUserPoint } from '../../dom';
import type { Emitter } from '../events';
import { setPointSelected } from '../pathPointSelection';
import { snapPointToGrid } from '../snapGrid';
import { applyPathReshapePreview } from './preview';
import { createPathReshapeDragState, type PathReshapeDragState } from './state';

const CLICK_SLOP_PX = 3;

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
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startScreen.x, event.clientY - drag.startScreen.y) < CLICK_SLOP_PX
    ) {
      return;
    }
    drag.moved = true;
    const point = snapPointToGrid(this.#svg, pointerUserPoint(this.#svg, event));
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
    const withRadii = drag.inserted && drag.cornerRadii.length ? { cornerRadii: drag.cornerRadii } : {};
    if (!drag.moved && drag.inserted) {
      this.#emitter.emit('pathPointChange', {
        owner: drag.owner,
        points: drag.points.map(([x, y]) => ({ x, y })),
        ...withRadii,
      });
      return;
    }
    if (!drag.moved) {
      // A click picks the point, and with Shift it adds to what is picked.
      const picked = drag.handle.hasAttribute(PATH_POINT_SELECTED_ATTR);
      if (!event.shiftKey) {
        for (const other of drag.overlay?.querySelectorAll(`[${PATH_POINT_SELECTED_ATTR}]`) ?? []) {
          setPointSelected(other, false);
        }
      }
      setPointSelected(drag.handle, event.shiftKey ? !picked : true);
      return;
    }
    const point = snapPointToGrid(this.#svg, pointerUserPoint(this.#svg, event)) ?? {
      x: drag.points[drag.pointIndex][0],
      y: drag.points[drag.pointIndex][1],
    };
    const points = applyPathReshapePreview(drag, point);
    this.#emitter.emit('pathPointChange', {
      owner: drag.owner,
      points: points.map(([x, y]) => ({ x, y })),
      ...withRadii,
    });
  };

  cancel(): void {
    this.#drag = null;
  }
}
