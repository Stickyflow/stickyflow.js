import { dimensionGeometry } from '../../model/dimension';
import type { Point } from '../../model/geometry/types';
import { isCameraGesture, pointerUserPoint, pxPerUnit, SVG_NAMESPACE } from '../dom';
import type { Viewer } from '../viewer';
import { offsetOf, snapMeasurePoint } from './dimensionSnap';
import type { Emitter } from './events';
import { readSquareSnapStep } from './snapGrid';

export interface DimensionDrawOptions {
  onExit?: () => void;
}

export interface DimensionDrawHandle {
  start(options?: DimensionDrawOptions): void;
  cancel(): void;
  destroy(): void;
}

const COLOR = '#9b42df';

// Three clicks: where the measure starts, where it ends, and how far from them its line sits. With Shift the end stays level or upright.
export function bindDimensionDraw(viewer: Viewer, emitter: Emitter): DimensionDrawHandle {
  const svg = viewer.svg;
  const document = svg.ownerDocument;
  let active = false;
  let onExit: (() => void) | undefined;
  let start: Point | null = null;
  let end: Point | null = null;
  let cursor: Point | null = null;
  let onObject = false;
  let offset = 0;
  let group: SVGGElement | null = null;

  const add = <K extends 'path' | 'circle' | 'text'>(name: K, attributes: Record<string, string | number>) => {
    const node = document.createElementNS(SVG_NAMESPACE, name);
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, String(value));
    }
    group?.appendChild(node);
    return node;
  };

  const draw = () => {
    if (!group) {
      return;
    }
    group.replaceChildren();
    const unit = 1 / pxPerUnit(svg);
    const marker = (point: Point, strong: boolean) =>
      add('circle', {
        cx: point.x,
        cy: point.y,
        r: (strong ? 6 : 4) * unit,
        fill: strong ? COLOR : '#ffffff',
        stroke: COLOR,
        'stroke-width': 1.5 * unit,
      });
    const to = end ?? cursor;
    if (start && to) {
      const geometry = dimensionGeometry({ start, end: to, offset: end ? offset : 0 });
      const segments = [geometry.line, ...geometry.extensions];
      add('path', {
        d: segments.map(([a, b]) => `M ${a.x} ${a.y} L ${b.x} ${b.y}`).join(' '),
        fill: 'none',
        stroke: COLOR,
        'stroke-width': 1.5 * unit,
      });
      const label = add('text', {
        x: geometry.label.center.x,
        y: geometry.label.center.y,
        fill: COLOR,
        'font-size': 12 * unit,
        'font-weight': 600,
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        transform: `rotate(${geometry.label.angle} ${geometry.label.center.x} ${geometry.label.center.y})`,
      });
      label.textContent = String(Math.round(geometry.length * 10) / 10);
      marker(start, false);
    }
    if (end) {
      marker(end, false);
    } else if (cursor) {
      marker(cursor, onObject);
    }
  };

  const reset = (exit: boolean) => {
    group?.remove();
    group = null;
    active = false;
    start = null;
    end = null;
    cursor = null;
    offset = 0;
    const callback = onExit;
    onExit = undefined;
    if (exit) {
      callback?.();
    }
  };

  const place = (raw: Point, shift: boolean) => {
    const snapped = snapMeasurePoint(svg, raw);
    onObject = snapped.onObject;
    if (start && shift && !onObject) {
      const level = Math.abs(snapped.point.x - start.x) >= Math.abs(snapped.point.y - start.y);
      return level ? { x: snapped.point.x, y: start.y } : { x: start.x, y: snapped.point.y };
    }
    return snapped.point;
  };

  const measuredOffset = (raw: Point) => {
    if (!start || !end) {
      return 0;
    }
    const distance = offsetOf(start, end, raw);
    const step = readSquareSnapStep(svg) ?? 1;
    return Math.round(distance / step) * step;
  };

  const commit = () => {
    if (start && end) {
      emitter.emit('dimensionDrawComplete', { start, end, offset });
    }
    reset(true);
  };

  const pointerDown = (event: PointerEvent) => {
    if (!active || event.button !== 0 || isCameraGesture(event)) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    const raw = pointerUserPoint(svg, event);
    if (!raw) {
      return;
    }
    if (!start) {
      start = place(raw, false);
    } else if (!end) {
      const point = place(raw, event.shiftKey);
      if (point.x !== start.x || point.y !== start.y) {
        end = point;
      }
    } else {
      offset = measuredOffset(raw);
      commit();
      return;
    }
    draw();
  };

  const pointerMove = (event: PointerEvent) => {
    if (!active) {
      return;
    }
    event.stopPropagation();
    const raw = pointerUserPoint(svg, event);
    if (!raw) {
      return;
    }
    if (end) {
      offset = measuredOffset(raw);
    } else {
      cursor = place(raw, event.shiftKey);
    }
    draw();
  };

  const swallow = (event: Event) => {
    if (active) {
      event.stopPropagation();
    }
  };

  const keyDown = (event: KeyboardEvent) => {
    if (!active) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      reset(true);
    } else if (event.key === 'Enter' && end) {
      event.preventDefault();
      commit();
    }
  };

  svg.addEventListener('pointerdown', pointerDown, true);
  svg.addEventListener('pointermove', pointerMove, true);
  svg.addEventListener('pointerup', swallow, true);
  window.addEventListener('keydown', keyDown);

  return {
    start(options = {}) {
      reset(false);
      viewer.select([]);
      active = true;
      onExit = options.onExit;
      group = document.createElementNS(SVG_NAMESPACE, 'g');
      group.setAttribute('pointer-events', 'none');
      svg.appendChild(group);
    },
    cancel() {
      if (active) {
        reset(true);
      }
    },
    destroy() {
      reset(false);
      svg.removeEventListener('pointerdown', pointerDown, true);
      svg.removeEventListener('pointermove', pointerMove, true);
      svg.removeEventListener('pointerup', swallow, true);
      window.removeEventListener('keydown', keyDown);
    },
  };
}
