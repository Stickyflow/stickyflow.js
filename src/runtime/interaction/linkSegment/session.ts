import { roundedOrthogonalPathData } from '../../../renderScene/artifacts/link/roundedOrthogonalPathData';
import { findOwnerNode, isCameraGesture, isPrimary, pointerUserPoint, pxPerUnit, resolveOwner } from '../../dom';
import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';
import { isSnapDisabled } from '../snapGrid';

const SNAP_PX = 6;
const DRAG_THRESHOLD_PX = 3;
const GUIDE_COLOR = '#9b42df';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

interface SegmentData {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  ox: number;
  oy: number;
  movable: boolean;
}

interface SegmentDrag {
  owner: OwnerRef;
  path: SVGPathElement;
  overlay: Element;
  handle: SVGRectElement;
  segments: SegmentData[];
  index: number;
  axis: 'x' | 'y';
  base: number;
  start: number;
  origin: number;
  originalD: string;
  candidates: number[];
  guide: SVGLineElement;
  pointerId: number;
  startClient: { x: number; y: number };
  moved: boolean;
  value: number;
}

function parseSegments(path: SVGPathElement): SegmentData[] {
  try {
    return JSON.parse(path.getAttribute('data-sf-link-segments') ?? '[]') as SegmentData[];
  } catch {
    return [];
  }
}

function snapCandidates(svg: SVGSVGElement, axis: 'x' | 'y', excludeIds: Set<string>): number[] {
  const values: number[] = [];
  svg.querySelectorAll('[data-sf-primary][data-sf-id]').forEach(node => {
    const id = node.getAttribute('data-sf-id');
    if (!id || node.getAttribute('data-sf-role') === 'link' || excludeIds.has(id)) {
      return;
    }
    const box = (node as unknown as SVGGraphicsElement).getBBox();
    if (axis === 'y') {
      values.push(box.y, box.y + box.height / 2, box.y + box.height);
    } else {
      values.push(box.x, box.x + box.width / 2, box.x + box.width);
    }
  });
  return values;
}

function movedSegments(drag: SegmentDrag, value: number): SegmentData[] {
  const next = drag.segments.map(segment => ({ ...segment }));
  const target = next[drag.index];
  const before = next[drag.index - 1];
  const after = next[drag.index + 1];
  if (drag.axis === 'y') {
    target.ay = value;
    target.by = value;
    if (before) before.by = value;
    if (after) after.ay = value;
  } else {
    target.ax = value;
    target.bx = value;
    if (before) before.bx = value;
    if (after) after.ax = value;
  }
  return next;
}

function pathSegments(segments: SegmentData[]) {
  return segments.map(segment => {
    const start = { x: segment.ax, y: segment.ay };
    const end = { x: segment.bx, y: segment.by };
    return {
      start,
      end,
      midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      originalMidpoint: { x: segment.ox, y: segment.oy },
      isHorizontal: Math.abs(end.x - start.x) > Math.abs(end.y - start.y),
      canMove: segment.movable,
    };
  });
}

export class LinkSegmentSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #drag: SegmentDrag | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.#drag || isCameraGesture(event)) {
      return;
    }
    const target = event.target as Element | null;
    const handle = target?.closest('[data-sf-link-segment]') as SVGRectElement | null;
    const overlay = handle?.closest('[data-sf-selection-overlay]');
    const linkId = overlay?.getAttribute('data-sf-selection-overlay');
    if (!handle || !overlay || !linkId) {
      return;
    }
    const path = findOwnerNode(this.#svg, linkId, isPrimary) as unknown as SVGPathElement | null;
    const owner = path && resolveOwner(path);
    const index = Number(handle.getAttribute('data-sf-link-segment'));
    const segments = path ? parseSegments(path) : [];
    const segment = segments[index];
    const point = pointerUserPoint(this.#svg, event);
    if (!path || !owner || !segment || !point) {
      return;
    }
    const axis = handle.getAttribute('data-sf-link-segment-axis') === 'x' ? 'x' : 'y';
    const guide = document.createElementNS(SVG_NAMESPACE, 'line');
    guide.setAttribute('stroke', GUIDE_COLOR);
    guide.setAttribute('stroke-dasharray', '4 4');
    guide.setAttribute('stroke-width', String(1 / pxPerUnit(this.#svg)));
    guide.setAttribute('visibility', 'hidden');
    overlay.appendChild(guide);
    handle.setPointerCapture?.(event.pointerId);
    const current = axis === 'y' ? segment.ay : segment.ax;
    this.#drag = {
      owner,
      path,
      overlay,
      handle,
      segments,
      index,
      axis,
      base: axis === 'y' ? segment.oy : segment.ox,
      start: axis === 'y' ? point.y : point.x,
      origin: current,
      originalD: path.getAttribute('d') ?? '',
      candidates: snapCandidates(this.#svg, axis, new Set([linkId])),
      guide,
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      moved: false,
      value: current,
    };
  };

  readonly pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const travelled = Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y);
    if (!drag.moved && travelled < DRAG_THRESHOLD_PX) {
      return;
    }
    drag.moved = true;
    const point = pointerUserPoint(this.#svg, event);
    if (!point) {
      return;
    }
    const raw = drag.origin + ((drag.axis === 'y' ? point.y : point.x) - drag.start);
    const { value, snapped } = this.#snap(drag, raw);
    drag.value = value;
    this.#preview(drag, snapped);
  };

  readonly pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    this.#drag = null;
    drag.handle.releasePointerCapture?.(drag.pointerId);
    drag.guide.remove();
    if (!drag.moved) {
      return;
    }
    const offset = Math.round((drag.value - drag.base) * 10) / 10;
    this.#emitter.emit('linkSegmentChange', { owner: drag.owner, index: drag.index, offset });
  };

  readonly doubleClick = (event: MouseEvent): void => {
    const handle = (event.target as Element | null)?.closest('[data-sf-link-segment]');
    const linkId = handle?.closest('[data-sf-selection-overlay]')?.getAttribute('data-sf-selection-overlay');
    const path = linkId ? (findOwnerNode(this.#svg, linkId, isPrimary) as unknown as SVGPathElement | null) : null;
    const owner = path && resolveOwner(path);
    if (!handle || !owner) {
      return;
    }
    this.#emitter.emit('linkSegmentChange', { owner, index: Number(handle.getAttribute('data-sf-link-segment')), offset: 0 });
  };

  cancel(): void {
    const drag = this.#drag;
    if (!drag) {
      return;
    }
    drag.path.setAttribute('d', drag.originalD);
    drag.guide.remove();
    this.#drag = null;
  }

  #snap(drag: SegmentDrag, raw: number): { value: number; snapped: number | null } {
    if (isSnapDisabled(this.#svg)) {
      return { value: raw, snapped: null };
    }
    const threshold = SNAP_PX / pxPerUnit(this.#svg);
    let best: number | null = null;
    for (const candidate of [drag.base, ...drag.candidates]) {
      const closer = best === null || Math.abs(candidate - raw) < Math.abs(best - raw);
      if (Math.abs(candidate - raw) <= threshold && closer) {
        best = candidate;
      }
    }
    return best === null ? { value: raw, snapped: null } : { value: best, snapped: best };
  }

  #preview(drag: SegmentDrag, snapped: number | null): void {
    const next = movedSegments(drag, drag.value);
    const strokeWidth = Number(drag.path.getAttribute('stroke-width')) || 2;
    const data = roundedOrthogonalPathData(pathSegments(next), Math.max(16, strokeWidth * 4));
    drag.path.setAttribute('d', data);
    drag.overlay.querySelector('path')?.setAttribute('d', data);
    const segment = next[drag.index];
    const width = Number(drag.handle.getAttribute('width'));
    const height = Number(drag.handle.getAttribute('height'));
    drag.handle.setAttribute('x', String((segment.ax + segment.bx) / 2 - width / 2));
    drag.handle.setAttribute('y', String((segment.ay + segment.by) / 2 - height / 2));
    const view = this.#svg.viewBox.baseVal;
    if (snapped === null) {
      drag.guide.setAttribute('visibility', 'hidden');
      return;
    }
    drag.guide.setAttribute('visibility', 'visible');
    if (drag.axis === 'y') {
      drag.guide.setAttribute('x1', String(view.x));
      drag.guide.setAttribute('x2', String(view.x + view.width));
      drag.guide.setAttribute('y1', String(snapped));
      drag.guide.setAttribute('y2', String(snapped));
    } else {
      drag.guide.setAttribute('y1', String(view.y));
      drag.guide.setAttribute('y2', String(view.y + view.height));
      drag.guide.setAttribute('x1', String(snapped));
      drag.guide.setAttribute('x2', String(snapped));
    }
  }
}
