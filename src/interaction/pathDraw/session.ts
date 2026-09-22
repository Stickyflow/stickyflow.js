import { isCameraGesture, pointerUserPoint, pxPerUnit } from '../../domContract';
import type { Emitter } from '../events';
import { isCloseToStart, MIN_POINTS_OPEN, MIN_POINTS_TO_CLOSE } from './geometry';
import { createPathDrawPreview, updatePathDrawPreview } from './preview';
import { createIdlePathDrawState, type PathDrawState } from './state';

export interface PathDrawOptions {
  tension?: number;
  onExit?: () => void;
}

const CLOSE_SNAP_PX = 12;
const DOUBLE_CLICK_MS = 400;
const DOUBLE_CLICK_PX = 10;

export class PathDrawSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #state: PathDrawState = createIdlePathDrawState();

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

    const closeSnapUnits = CLOSE_SNAP_PX / pxPerUnit(this.#svg);
    if (isCloseToStart(this.#state.points, point, closeSnapUnits)) {
      this.#commit(true);
      return;
    }

    this.#state.points = [...this.#state.points, point];
    this.#state.cursor = point;
    updatePathDrawPreview(this.#svg, this.#state);
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
    const closeSnapUnits = CLOSE_SNAP_PX / pxPerUnit(this.#svg);
    this.#state.cursor = point;
    this.#state.willClose = isCloseToStart(this.#state.points, point, closeSnapUnits);
    updatePathDrawPreview(this.#svg, this.#state);
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
    if (!this.#state.active) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.#reset(true);
    } else if (event.key === 'Enter' && this.#state.points.length >= MIN_POINTS_OPEN) {
      event.preventDefault();
      this.#commit(false);
    }
  };

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
    const exit = this.#state.onExit;
    this.#state = createIdlePathDrawState();
    if (callExit) {
      exit?.();
    }
  }
}
