import { getPathPoints } from '../model/geometry/connectionLine';
import { type Bounds, portToPoint, type Side } from '../model/geometry/router';
import type { Link, PathType } from '../model/links';
import type { OwnerRef, Viewer } from '../viewer';
import { isCameraGesture, resolveOwner } from '../viewer/contract';
import { findOwnerNode, isPrimary } from '../viewer/domQuery';
import type { Emitter } from './events';
import { nearestPort, sideFromDirection } from './linkEndpointDrag';
import { previewPathData } from './linkPreview';

export interface QuickDuplicateHandle {
  destroy(): void;
}

const SCREEN_DRAG_THRESHOLD = 3;
const PREVIEW_STROKE = '#9b42df';
const SVG_NS = 'http://www.w3.org/2000/svg';
const NEW_LINK_PATH_TYPE: PathType = 'orthogonal';

type Direction = 'top' | 'right' | 'bottom' | 'left';

interface Candidate {
  owner: OwnerRef;
  bounds: Bounds;
}

interface DragState {
  sourceOwner: OwnerRef;
  direction: Direction;
  fixedPoint: { x: number; y: number };
  previewPath: SVGPathElement;
  candidates: Candidate[];
  pointerId: number;
  startScreen: { x: number; y: number };
  moved: boolean;
  hit: { owner: OwnerRef; side: Side; offset: number } | null;
}

export function bindQuickDuplicate(viewer: Viewer, emitter: Emitter): QuickDuplicateHandle {
  const svg = viewer.svg;
  let drag: DragState | null = null;

  const userPoint = (e: PointerEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const applyPreview = (toPoint: { x: number; y: number }, toSide: Side) => {
    if (!drag) return;
    const fakeLink: Link = {
      id: 'preview',
      fromId: '',
      toId: '',
      layer_group: '',
      order_key: '',
      is_visible: true,
      is_locked: false,
      fromPoint: { side: drag.direction, offset: 0.5 },
      toPoint: { side: toSide, offset: 0.5 },
    };
    const { points, segments } = getPathPoints(fakeLink, drag.fixedPoint, toPoint, NEW_LINK_PATH_TYPE);
    drag.previewPath.setAttribute('d', previewPathData(points, segments, NEW_LINK_PATH_TYPE, 2));
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    if (isCameraGesture(e)) return;
    const bubble = (e.target as Element | null)?.closest('[data-sf-quick-duplicate]');
    if (!bubble) return;
    const direction = bubble.getAttribute('data-sf-quick-duplicate') as Direction;
    const ownerId = bubble.closest('[data-sf-selection-overlay]')?.getAttribute('data-sf-selection-overlay');
    if (!ownerId) return;
    const primary = findOwnerNode(svg, ownerId, isPrimary);
    const sourceOwner = primary ? resolveOwner(primary) : null;
    if (!primary || !sourceOwner) return;

    const fixedPoint = portToPoint(primary.getBBox(), { side: direction, offset: 0.5 });

    const candidates: Candidate[] = [];
    svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary]').forEach(el => {
      if (el.getAttribute('data-sf-role') === 'link') return;
      const owner = resolveOwner(el);
      if (!owner || owner.id === ownerId) return;
      candidates.push({ owner, bounds: el.getBBox() });
    });

    const previewPath = document.createElementNS(SVG_NS, 'path');
    previewPath.setAttribute('fill', 'none');
    previewPath.setAttribute('stroke', PREVIEW_STROKE);
    previewPath.setAttribute('stroke-width', '2');
    previewPath.setAttribute('stroke-dasharray', '6 4');
    previewPath.style.pointerEvents = 'none';

    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag = {
      sourceOwner,
      direction,
      fixedPoint,
      previewPath,
      candidates,
      pointerId: e.pointerId,
      startScreen: { x: e.clientX, y: e.clientY },
      moved: false,
      hit: null,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      const screenDist = Math.hypot(e.clientX - drag.startScreen.x, e.clientY - drag.startScreen.y);
      if (screenDist < SCREEN_DRAG_THRESHOLD) return;
      drag.moved = true;
      svg.appendChild(drag.previewPath);
    }
    const point = userPoint(e);
    let target: Candidate | null = null;
    for (let i = drag.candidates.length - 1; i >= 0; i--) {
      const c = drag.candidates[i];
      if (
        point.x >= c.bounds.x &&
        point.x <= c.bounds.x + c.bounds.width &&
        point.y >= c.bounds.y &&
        point.y <= c.bounds.y + c.bounds.height
      ) {
        target = c;
        break;
      }
    }
    if (target) {
      const port = nearestPort(target.bounds, point);
      drag.hit = { owner: target.owner, side: port.side, offset: port.offset };
      applyPreview(portToPoint(target.bounds, port), port.side);
    } else {
      drag.hit = null;
      applyPreview(point, sideFromDirection(drag.fixedPoint, point));
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    (e.target as Element).releasePointerCapture?.(d.pointerId);
    d.previewPath.remove();

    if (!d.moved) {
      emitter.emit('quickDuplicate', { owner: d.sourceOwner, direction: d.direction });
      return;
    }
    if (!d.hit) return;
    emitter.emit('linkTo', {
      owner: d.sourceOwner,
      direction: d.direction,
      target: d.hit.owner,
      side: d.hit.side,
      fraction: Math.round(d.hit.offset * 100) / 100,
    });
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);

  return {
    destroy() {
      drag?.previewPath.remove();
      drag = null;
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
    },
  };
}
