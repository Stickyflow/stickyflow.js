import {
  clearAlignmentGuides,
  type GuideLine,
  isCameraGesture,
  pointerUserPoint,
  pxPerUnit,
  updateAlignmentGuides,
} from '../../dom';
import type { Emitter } from '../events';
import {
  type DrawPoint,
  isCloseToStart,
  MIN_POINTS_OPEN,
  MIN_POINTS_TO_CLOSE,
  snapTo45Degrees,
  snapToSessionGuides,
} from './geometry';
import { createPathDrawPreview, updatePathDrawPreview } from './preview';
import { createIdlePathDrawState, type PathDrawState } from './state';

export interface PathDrawOptions {
  tension?: number;
  onExit?: () => void;
}

const CLOSE_SNAP_PX = 12;
const GUIDE_SNAP_PX = 14;
const GUIDE_COLOR = '#4CAF50';
const DOUBLE_CLICK_MS = 400;
const DOUBLE_CLICK_PX = 10;

export class PathDrawSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #state: PathDrawState = createIdlePathDrawState();
  #shiftHeld = false;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  start(options: PathDrawOptions = {}): void {
    if (this.#state.active) {
      this.#reset(false);
    }
    const { group, line } = createPathDrawPreview(this.#svg);
    this.#svg.appendChild(group);
    this.#state = {
      ...createIdlePathDrawState(),
      active: true,
      tension: options.tension ?? 0,
      onExit: options.onExit ?? null,
      previewGroup: group,
      previewLine: line,
    };
  }

  cancel(): void {
    if (this.#state.active) {
      this.#reset(true);
    }
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (!this.#state.active || event.button !== 0 || isCameraGesture(event)) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();

    const point = pointerUserPoint(this.#svg, event);
    if (!point) {
      return;
    }

    const now = Date.now();
    const last = this.#state.lastDown;
    this.#state.lastDown = { time: now, x: event.clientX, y: event.clientY };
    if (
      last &&
      now - last.time < DOUBLE_CLICK_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < DOUBLE_CLICK_PX
    ) {
      return;
    }

    const resolved = this.#resolvePoint(point);
    if (resolved.willClose) {
      this.#commit(true);
      return;
    }

    this.#state.points = [...this.#state.points, resolved.point];
    this.#state.cursor = resolved.point;
    this.#state.willClose = false;
    updatePathDrawPreview(this.#svg, this.#state);
    clearAlignmentGuides(this.#svg);
  };

  readonly pointerMove = (event: PointerEvent): void => {
    if (!this.#state.active) {
      return;
    }
    event.stopPropagation();
    const point = pointerUserPoint(this.#svg, event);
    if (!point) {
      return;
    }
    const resolved = this.#resolvePoint(point);
    this.#state.cursor = resolved.point;
    this.#state.willClose = resolved.willClose;
    updatePathDrawPreview(this.#svg, this.#state);
    if (resolved.guide) {
      updateAlignmentGuides(this.#svg, [resolved.guide], GUIDE_COLOR);
    } else {
      clearAlignmentGuides(this.#svg);
    }
  };

  readonly pointerUp = (event: PointerEvent): void => {
    if (!this.#state.active) {
      return;
    }
    event.stopPropagation();
  };

  readonly dblClick = (event: MouseEvent): void => {
    if (!this.#state.active) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    if (this.#state.points.length >= MIN_POINTS_OPEN) {
      this.#commit(false);
    }
  };

  readonly keyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.#shiftHeld = true;
    }
    if (!this.#state.active) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#reset(true);
    } else if (event.key === 'Enter' && this.#state.points.length >= MIN_POINTS_OPEN) {
      event.preventDefault();
      this.#commit(false);
    } else if (event.key === 'Backspace' && this.#state.points.length > 0) {
      event.preventDefault();
      this.#state.points = this.#state.points.slice(0, -1);
      const closeSnapUnits = CLOSE_SNAP_PX / pxPerUnit(this.#svg);
      this.#state.willClose = this.#state.cursor
        ? isCloseToStart(this.#state.points, this.#state.cursor, closeSnapUnits)
        : false;
      updatePathDrawPreview(this.#svg, this.#state);
      clearAlignmentGuides(this.#svg);
    }
  };

  readonly keyUp = (event: KeyboardEvent): void => {
    if (event.key === 'Shift') {
      this.#shiftHeld = false;
    }
  };

  #resolvePoint(raw: DrawPoint): { point: DrawPoint; willClose: boolean; guide: GuideLine | null } {
    const closeSnapUnits = CLOSE_SNAP_PX / pxPerUnit(this.#svg);
    if (isCloseToStart(this.#state.points, raw, closeSnapUnits)) {
      return { point: this.#state.points[0], willClose: true, guide: null };
    }
    const points = this.#state.points;
    const last = points[points.length - 1];
    if (!this.#shiftHeld || !last) {
      return { point: raw, willClose: false, guide: null };
    }
    const angleSnapped = snapTo45Degrees(last, raw);
    const guideSnapUnits = GUIDE_SNAP_PX / pxPerUnit(this.#svg);
    const { point, guide } = snapToSessionGuides(last, angleSnapped, points.slice(0, -1), raw, guideSnapUnits);
    return { point, willClose: false, guide };
  }

  #commit(closed: boolean): void {
    const points = this.#state.points;
    const minPoints = closed ? MIN_POINTS_TO_CLOSE : MIN_POINTS_OPEN;
    if (points.length >= minPoints) {
      this.#emitter.emit('pathDrawComplete', { points: [...points], closed, tension: this.#state.tension });
    }
    this.#reset(true);
  }

  #reset(callExit: boolean): void {
    this.#state.previewGroup?.remove();
    clearAlignmentGuides(this.#svg);
    const exit = this.#state.onExit;
    this.#state = createIdlePathDrawState();
    this.#shiftHeld = false;
    if (callExit) {
      exit?.();
    }
  }
}
