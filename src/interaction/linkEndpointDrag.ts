import { getPathPoints } from '../model/geometry/connectionLine';
import { type Bounds, chooseSide, portToPoint, projectOffsetOnSide, type Side } from '../model/geometry/router';
import type { Link, PathType } from '../model/links';
import type { OwnerRef, Viewer } from '../viewer';
import { isCameraGesture, resolveOwner } from '../viewer/contract';
import { findOwnerNode, isPrimary } from '../viewer/domQuery';
import type { LinkEndpoint } from '../viewer/selectionOverlay';
import type { Emitter } from './events';
import { previewPathData } from './linkPreview';

export interface LinkEndpointDragHandle {
  destroy(): void;
}

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];
const SCREEN_DRAG_THRESHOLD = 3;

export function nearestPort(bounds: Bounds, point: { x: number; y: number }): { side: Side; offset: number } {
  let best: { side: Side; offset: number } = { side: 'right', offset: 0.5 };
  let bestDist = Infinity;
  for (const side of SIDES) {
    const offset = Math.max(0, Math.min(1, projectOffsetOnSide(bounds, side, point)));
    const candidate = portToPoint(bounds, { side, offset });
    const dist = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = { side, offset };
    }
  }
  return best;
}

export function sideFromDirection(from: { x: number; y: number }, to: { x: number; y: number }): Side {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) return 'right';
  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) return 'bottom';
  if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) return 'top';
  return 'left';
}

interface Candidate {
  owner: OwnerRef;
  bounds: Bounds;
}

interface DragState {
  linkOwner: OwnerRef;
  end: LinkEndpoint;
  path: SVGPathElement;
  pathType: PathType;
  strokeWidth: number;
  originalD: string;
  fixedPoint: { x: number; y: number };
  fixedSide: Side;
  candidates: Candidate[];
  pointerId: number;
  startScreen: { x: number; y: number };
  moved: boolean;
  hit: { owner: OwnerRef; side: Side; offset: number } | null;
}

export function bindLinkEndpointDrag(viewer: Viewer, emitter: Emitter): LinkEndpointDragHandle {
  const svg = viewer.svg;
  let drag: DragState | null = null;

  const userPoint = (e: PointerEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const applyPreview = (draggedWorld: { x: number; y: number }, draggedSide: Side) => {
    if (!drag) return;
    const fromPoint = drag.end === 'from' ? draggedWorld : drag.fixedPoint;
    const toPoint = drag.end === 'to' ? draggedWorld : drag.fixedPoint;
    const fromSide = drag.end === 'from' ? draggedSide : drag.fixedSide;
    const toSide = drag.end === 'to' ? draggedSide : drag.fixedSide;
    const fakeLink: Link = {
      id: 'preview',
      fromId: '',
      toId: '',
      layer_group: '',
      order_key: '',
      is_visible: true,
      is_locked: false,
      fromPoint: { side: fromSide, offset: 0.5 },
      toPoint: { side: toSide, offset: 0.5 },
    };
    const { points, segments } = getPathPoints(fakeLink, fromPoint, toPoint, drag.pathType);
    drag.path.setAttribute('d', previewPathData(points, segments, drag.pathType, drag.strokeWidth));
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    if (isCameraGesture(e)) return;
    const target = e.target as Element | null;
    const end = target?.closest('[data-sf-link-endpoint]')?.getAttribute('data-sf-link-endpoint') as
      | LinkEndpoint
      | null
      | undefined;
    if (!end) return;
    const overlay = target?.closest('[data-sf-selection-overlay]');
    const linkId = overlay?.getAttribute('data-sf-selection-overlay');
    if (!linkId) return;
    const path = findOwnerNode(svg, linkId, isPrimary) as unknown as SVGPathElement | null;
    if (!path) return;
    const linkOwner = resolveOwner(path);
    if (!linkOwner) return;

    const fromId = path.getAttribute('data-sf-from');
    const toId = path.getAttribute('data-sf-to');
    const otherId = end === 'from' ? toId : fromId;
    const otherPrimary = otherId ? findOwnerNode(svg, otherId, isPrimary) : null;
    if (!otherId || !otherPrimary) return;

    const length = path.getTotalLength();
    const fixedPoint = end === 'from' ? path.getPointAtLength(length) : path.getPointAtLength(0);
    const fixedSideAttr = (
      end === 'from' ? path.getAttribute('data-sf-to-side') : path.getAttribute('data-sf-from-side')
    ) as Side | null;
    const draggedId = end === 'from' ? fromId : toId;
    const draggedPrimary = draggedId ? findOwnerNode(svg, draggedId, isPrimary) : null;
    const fixedSide: Side =
      fixedSideAttr ?? (draggedPrimary ? chooseSide(otherPrimary.getBBox(), draggedPrimary.getBBox()) : 'right');

    const pathType = (path.getAttribute('data-sf-route') as PathType | null) ?? 'straight';
    const strokeWidth = Number(path.getAttribute('stroke-width')) || 2;

    const candidates: Candidate[] = [];
    svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary]').forEach(el => {
      if (el.getAttribute('data-sf-role') === 'link') return;
      const owner = resolveOwner(el);
      if (!owner) return;
      candidates.push({ owner, bounds: el.getBBox() });
    });

    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag = {
      linkOwner,
      end,
      path,
      pathType,
      strokeWidth,
      originalD: path.getAttribute('d') ?? '',
      fixedPoint: { x: fixedPoint.x, y: fixedPoint.y },
      fixedSide,
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
    if (!d.moved) return;
    if (!d.hit) {
      d.path.setAttribute('d', d.originalD);
      return;
    }
    emitter.emit('linkReconnect', {
      owner: d.linkOwner,
      end: d.end,
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
      drag = null;
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
    },
  };
}
