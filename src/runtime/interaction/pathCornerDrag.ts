import { cornerFrame } from '../../model/path/fillet';
import { freeformPathData } from '../../renderScene/scene/freeformPath';
import { PATH_CORNER_INDEX_ATTR } from '../../svg/domContract/attributes';
import {
  cornerHandleOffset,
  findOwnerNode,
  isCameraGesture,
  isPrimary,
  PATH_HALO_ATTR,
  pathGeometryOf,
  pointerUserPoint,
  resolveOwner,
} from '../dom';
import type { OwnerRef, Viewer } from '../viewer';
import type { Emitter } from './events';

export interface PathCornerDragHandle {
  destroy(): void;
}

interface CornerDrag {
  owner: OwnerRef;
  pathNode: SVGPathElement;
  handle: Element;
  overlay: Element | null;
  index: number;
  radii: number[];
  points: Array<[number, number]>;
  closed: boolean;
  corner: { x: number; y: number };
  frame: NonNullable<ReturnType<typeof cornerFrame>>;
  offset: number;
  pointerId: number;
  moved: boolean;
}

function startDrag(svg: SVGSVGElement, event: PointerEvent): CornerDrag | null {
  const handle = (event.target as Element | null)?.closest?.(`[${PATH_CORNER_INDEX_ATTR}]`) ?? null;
  const overlay = handle?.closest('[data-sf-selection-overlay]') ?? null;
  const ownerId = overlay?.getAttribute('data-sf-selection-overlay');
  const index = Number(handle?.getAttribute(PATH_CORNER_INDEX_ATTR));
  const pathNode = ownerId ? findOwnerNode<SVGPathElement>(svg, ownerId, isPrimary) : null;
  const owner = pathNode && resolveOwner(pathNode);
  const geometry = pathNode && pathGeometryOf(pathNode);
  if (!handle || !pathNode || !owner || !geometry || !Number.isInteger(index)) {
    return null;
  }
  const { points, closed } = geometry;
  const count = points.length;
  const at = (position: number) => {
    const [x, y] = points[(position + count) % count];
    return { x, y };
  };
  const corner = at(index);
  const frame = cornerFrame(at(index - 1), corner, at(index + 1));
  if (!frame) {
    return null;
  }
  return {
    owner,
    pathNode,
    handle,
    overlay,
    index,
    radii: points.map((_, position) => geometry.cornerRadii[position] ?? 0),
    points,
    closed,
    corner,
    frame,
    offset: cornerHandleOffset(svg),
    pointerId: event.pointerId,
    moved: false,
  };
}

function applyRadius(drag: CornerDrag, radius: number): void {
  drag.radii[drag.index] = radius;
  const d = freeformPathData({
    points: drag.points.map(([x, y]) => ({ x, y })),
    tension: 0,
    closed: drag.closed,
    cornerRadii: drag.radii,
  });
  drag.pathNode.setAttribute('d', d);
  drag.overlay?.querySelector(`[${PATH_HALO_ATTR}]`)?.setAttribute('d', d);
  const distance = drag.offset + radius / drag.frame.halfSine;
  drag.handle.setAttribute('cx', String(drag.corner.x + drag.frame.inward.x * distance));
  drag.handle.setAttribute('cy', String(drag.corner.y + drag.frame.inward.y * distance));
}

// A handle inside each corner of a straight path: it moves along the line through the middle of the corner, and the further from the corner the larger the radius.
export function bindPathCornerDrag(viewer: Viewer, emitter: Emitter): PathCornerDragHandle {
  const svg = viewer.svg;
  let drag: CornerDrag | null = null;

  const pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || drag || isCameraGesture(event)) {
      return;
    }
    drag = startDrag(svg, event);
    if (drag) {
      (drag.handle as SVGGraphicsElement).setPointerCapture?.(event.pointerId);
      event.stopPropagation();
    }
  };
  const pointerMove = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const point = pointerUserPoint(svg, event);
    if (!point) {
      return;
    }
    const along =
      (point.x - drag.corner.x) * drag.frame.inward.x + (point.y - drag.corner.y) * drag.frame.inward.y - drag.offset;
    drag.moved = true;
    applyRadius(drag, Math.round(Math.min(drag.frame.maxRadius, Math.max(0, along * drag.frame.halfSine))));
  };
  const pointerUp = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const finished = drag;
    drag = null;
    if (finished.moved) {
      emitter.emit('pathCornerChange', { owner: finished.owner, cornerRadii: finished.radii });
    }
  };

  svg.addEventListener('pointerdown', pointerDown, { capture: true });
  svg.addEventListener('pointermove', pointerMove);
  svg.addEventListener('pointerup', pointerUp);
  return {
    destroy() {
      drag = null;
      svg.removeEventListener('pointerdown', pointerDown, { capture: true });
      svg.removeEventListener('pointermove', pointerMove);
      svg.removeEventListener('pointerup', pointerUp);
    },
  };
}
