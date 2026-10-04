import { clearAlignmentGuides, pointerUserPoint, pxPerUnit, updateAlignmentGuides } from '../../dom';
import type { Emitter } from '../events';
import { offsetBounds } from '../move/geometry';
import { computeSnap, MOVE_ACTIVE_POINTS, nearestCandidates } from '../snapGeometry';
import { clearSankeyNodeDragPreview, updateSankeyNodeDragPreview } from './preview';
import { resolveSankeyNodeDrag } from './target';
import type { SankeyNodeDragState } from './types';

const MOVE_NOISE = 2;
const SNAP_THRESHOLD_PX = 20;
const GUIDE_OVERHANG = 10;
const GUIDE_COLOR = '#8b5cf6';

export class SankeyNodeDragSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: SankeyNodeDragState | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(event: PointerEvent): boolean {
    if (this.#drag) {
      return false;
    }
    this.#drag = resolveSankeyNodeDrag(this.#svg, event);
    return this.#drag !== null;
  }

  move(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const point = pointerUserPoint(this.#svg, event);
    if (!point) {
      return;
    }
    const drag = this.#drag;
    const rawDx = point.x - drag.startX;
    const rawDy = point.y - drag.startY;
    if (!drag.moved && Math.hypot(rawDx, rawDy) < MOVE_NOISE) {
      return;
    }
    drag.moved = true;

    const leadBounds = offsetBounds(drag.originalBounds, rawDx, rawDy);
    const candidates = nearestCandidates(leadBounds, drag.siblingBounds);
    const snap = computeSnap(leadBounds, candidates, {
      threshold: SNAP_THRESHOLD_PX / pxPerUnit(this.#svg),
      activeX: MOVE_ACTIVE_POINTS,
      activeY: MOVE_ACTIVE_POINTS,
      guideOverhang: GUIDE_OVERHANG,
    });
    const dx = rawDx + snap.x.delta;
    const dy = rawDy + snap.y.delta;
    drag.lastDx = dx;
    drag.lastDy = dy;
    updateSankeyNodeDragPreview(drag, dx, dy);
    updateAlignmentGuides(
      this.#svg,
      [snap.x.guide, snap.y.guide].filter(guide => guide !== null),
      GUIDE_COLOR,
    );
  }

  cancel(): void {
    if (this.#drag) {
      clearSankeyNodeDragPreview(this.#drag);
    }
    this.#drag = null;
    clearAlignmentGuides(this.#svg);
  }

  finish(event: PointerEvent): void {
    if (!this.#drag || event.pointerId !== this.#drag.pointerId) {
      return;
    }
    const drag = this.#drag;
    this.#drag = null;
    (event.target as Element)?.releasePointerCapture?.(drag.pointerId);
    clearSankeyNodeDragPreview(drag);
    clearAlignmentGuides(this.#svg);
    if (!drag.moved) {
      return;
    }
    this.#emitter.emit('sankeyNodeMove', { owner: drag.owner, nodeId: drag.nodeId, dx: drag.lastDx, dy: drag.lastDy });
  }
}
