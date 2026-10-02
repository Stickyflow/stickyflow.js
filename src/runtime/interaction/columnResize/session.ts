import { clearAlignmentGuides, updateAlignmentGuides } from '../../dom';
import type { Emitter } from '../events';
import { resizePointerPosition } from '../resize/pointer';
import { type ColumnResizeDragState, createColumnResizeDragState } from './state';

const GUIDE_COLOR = '#4CAF50';
const MIN_COLUMN_WIDTH = 30;

function liveWidth(drag: ColumnResizeDragState, pointerX: number): number {
  const declaredDelta = (pointerX - drag.startX) / drag.widthScale;
  return Math.max(MIN_COLUMN_WIDTH / drag.widthScale, drag.startWidth + declaredDelta);
}

export class ColumnResizeSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: ColumnResizeDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag) {
      return;
    }
    this.#drag = createColumnResizeDragState(this.#svg, event);
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    drag.moved = true;
    const { x } = resizePointerPosition(this.#svg, event);
    const width = liveWidth(drag, x);
    updateAlignmentGuides(
      this.#svg,
      [
        {
          orientation: 'vertical',
          position: drag.startX + (width - drag.startWidth) * drag.widthScale,
          from: drag.guideFromY,
          to: drag.guideToY,
        },
      ],
      GUIDE_COLOR,
    );
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    this.#drag = null;
    (event.target as Element | null)?.releasePointerCapture?.(drag.pointerId);
    clearAlignmentGuides(this.#svg);
    if (!drag.moved) {
      return;
    }
    const { x } = resizePointerPosition(this.#svg, event);
    this.#emitter.emit('columnResizeChange', {
      owner: drag.owner,
      columnId: drag.columnId,
      width: liveWidth(drag, x),
    });
  };

  cancel(): void {
    this.#drag = null;
  }
}
