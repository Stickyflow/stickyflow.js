import { PATH_POINTS_ATTR } from '../../../svg/domContract/attributes';
import {
  clearAlignmentGuides,
  type GuideLine,
  isCameraGesture,
  pathGeometryOf,
  pointerUserPoint,
  pxPerUnit,
  resolveOwner,
  updateAlignmentGuides,
} from '../../dom';
import type { Emitter } from '../events';
import { snapPointToGrid } from '../snapGrid';
import {
  type DrawPoint,
  isCloseToStart,
  MIN_POINTS_OPEN,
  MIN_POINTS_TO_CLOSE,
  snapTo45Degrees,
  snapToSessionGuides,
} from './geometry';
import { createPathDrawPreview, updatePathDrawPreview } from './preview';
import { createIdlePathDrawState, type PathContinuation, type PathDrawState } from './state';

export interface PathDrawOptions {
  tension?: number;
  onExit?: () => void;
}

const CLOSE_SNAP_PX = 12;
const POINT_SNAP_PX = 10;
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

    const raw = pointerUserPoint(this.#svg, event);
    const hit = raw && this.#pointNear(raw);
    const point = hit?.point ?? snapPointToGrid(this.#svg, raw);
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

    const resolved = hit ? { point: hit.point, willClose: false, guide: null } : this.#resolvePoint(point);
    if (resolved.willClose) {
      this.#commit(true);
      return;
    }
    if (hit?.continues && this.#state.points.length > 0 && this.#finishOn(hit.continues)) {
      return;
    }
    if (hit && this.#state.points.length === 0) {
      this.#state.continues = hit.continues;
      this.#state.tension = hit.continues?.tension ?? this.#state.tension;
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
    const raw = pointerUserPoint(this.#svg, event);
    const hit = raw && this.#pointNear(raw);
    const point = hit?.point ?? snapPointToGrid(this.#svg, raw);
    if (!point) {
      return;
    }
    const resolved = hit ? { point: hit.point, willClose: false, guide: null } : this.#resolvePoint(point);
    this.#state.onPoint = Boolean(hit);
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

  // A point of a path near the pointer. From an end of an open path the drawing goes on as that path.
  #pointNear(raw: DrawPoint): { point: DrawPoint; continues: (PathContinuation & { tension: number }) | null } | null {
    const reach = POINT_SNAP_PX / pxPerUnit(this.#svg);
    if (isCloseToStart(this.#state.points, raw, CLOSE_SNAP_PX / pxPerUnit(this.#svg))) {
      return null;
    }
    for (const node of this.#svg.querySelectorAll(`[${PATH_POINTS_ATTR}][data-sf-primary]`)) {
      const geometry = pathGeometryOf(node);
      const owner = resolveOwner(node);
      if (!geometry || !owner) {
        continue;
      }
      const index = geometry.points.findIndex(([x, y]) => Math.hypot(x - raw.x, y - raw.y) <= reach);
      if (index < 0) {
        continue;
      }
      const [x, y] = geometry.points[index];
      const last = geometry.points.length - 1;
      const end = !geometry.closed && (index === 0 || index === last);
      return {
        point: { x, y },
        continues: end
          ? {
              owner,
              atStart: index === 0,
              points: geometry.points.map(([px, py]) => ({ x: px, y: py })),
              cornerRadii: geometry.cornerRadii,
              tension: geometry.tension,
            }
          : null,
      };
    }
    return null;
  }

  // The drawing reached an end of an open path: it closes its own path there, or joins the other one into a single path.
  #finishOn(target: PathContinuation): boolean {
    const own = this.#state.continues;
    const drawn = this.#state.points;
    const same = own?.owner.id === target.owner.id;
    if (same && (own.atStart === target.atStart || drawn.length < 2)) {
      return true;
    }
    const oriented = (path: PathContinuation, startsAtPoint: boolean) => {
      const keep = path.atStart === startsAtPoint;
      return {
        points: keep ? path.points : [...path.points].reverse(),
        radii: path.points.map((_, index) => path.cornerRadii[keep ? index : path.points.length - 1 - index] ?? 0),
      };
    };
    const head = own ? oriented(own, false) : { points: drawn.slice(0, 1), radii: [0] };
    const tail = same ? { points: [], radii: [] } : oriented(target, true);
    const middle = drawn.slice(1);
    const radii = [...head.radii, ...middle.map(() => 0), ...tail.radii];
    this.#emitter.emit('pathDrawComplete', {
      points: [...head.points, ...middle, ...tail.points],
      closed: same,
      tension: this.#state.tension,
      continues: own?.owner ?? target.owner,
      ...(own && !same ? { absorbs: target.owner } : {}),
      ...(radii.some(radius => radius > 0) ? { cornerRadii: radii } : {}),
    });
    this.#reset(true);
    return true;
  }

  #commit(closed: boolean): void {
    const points = this.#state.points;
    const minPoints = closed ? MIN_POINTS_TO_CLOSE : MIN_POINTS_OPEN;
    const continues = this.#state.continues;
    if (continues && !closed && points.length >= MIN_POINTS_OPEN) {
      const added = points.slice(1);
      this.#emitter.emit('pathDrawComplete', {
        points: continues.atStart ? [...added.reverse(), ...continues.points] : [...continues.points, ...added],
        closed: false,
        tension: this.#state.tension,
        continues: continues.owner,
        ...(continues.cornerRadii.length
          ? {
              cornerRadii: continues.atStart
                ? [...added.map(() => 0), ...continues.cornerRadii]
                : [...continues.cornerRadii, ...added.map(() => 0)],
            }
          : {}),
      });
    } else if (points.length >= minPoints) {
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
