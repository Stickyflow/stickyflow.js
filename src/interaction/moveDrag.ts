// Drag-to-move a shape, with a live preview of its attached links — reusing
// the real router (model/geometry/), not an approximation, so an orthogonal
// link still looks orthogonal and a curved one still curves while dragging.
// (DOM code — browser-verified, like textEdit.ts.)
import type { Viewer, OwnerRef } from '../viewer';
import { resolveOwner } from '../viewer/contract';
import { findAllOwnerNodes, findOwnerNode, isPrimary } from '../viewer/domQuery';
import { getPathPoints, roundedOrthogonalPathData } from '../model/geometry/connectionLine';
import { portToPoint, type Side, type Bounds, type PathSegment } from '../model/geometry/router';
import type { Link, PathType } from '../model/links';
import { Emitter } from './events';

export interface MoveDragHandle {
  destroy(): void;
}

const MOVABLE_ROLES = new Set(['entity']);
const SCREEN_DRAG_THRESHOLD = 3;

const centerOf = (b: Bounds) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const offsetBounds = (b: Bounds, dx: number, dy: number): Bounds => ({ x: b.x + dx, y: b.y + dy, width: b.width, height: b.height });
const anchorPoint = (b: Bounds, side: Side | null) => (side ? portToPoint(b, { side, offset: 0.5 }) : centerOf(b));

/** The exact same `d` shape the real renderer would produce for this pathType
 *  (see buildRenderScene.ts's own pathData) — including orthogonal corner
 *  rounding, via the shared roundedOrthogonalPathData, so a link doesn't
 *  visibly change corner style between "being dragged" and "just rendered". */
function previewPathData(points: number[], segments: PathSegment[], pathType: PathType, strokeWidth: number): string {
  if (pathType === 'curved' && points.length >= 8) {
    return `M ${points[0]} ${points[1]} C ${points[2]} ${points[3]} ${points[4]} ${points[5]} ${points[6]} ${points[7]}`;
  }
  if (pathType === 'orthogonal' && segments.length) {
    return roundedOrthogonalPathData(segments, Math.max(16, strokeWidth * 4));
  }
  if (points.length < 4) return '';
  let d = `M ${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]} ${points[i + 1]}`;
  return d;
}

interface LiveLink {
  path: SVGPathElement;
  pathType: PathType;
  /** This link's own pinned sides (independent of which end is being dragged). */
  fromSide: Side | null;
  toSide: Side | null;
  /** The endpoint NOT being dragged — fixed for the whole gesture. */
  otherBounds: Bounds;
  /** True if the dragged entity is this link's `from` (affects which end moves). */
  draggedIsFrom: boolean;
  /** For orthogonal corner-rounding radius — matches buildRenderScene's own formula. */
  strokeWidth: number;
}

/** Links attached to `entityId`, live-routed through the real router while
 *  dragging (see previewPathData) — every route type, not just straight/
 *  curved: orthogonal is SFL's *default* pathType when a link doesn't set
 *  `route:` explicitly, so most real diagrams would otherwise show none of
 *  their links tracking the drag at all. */
function findLiveLinks(svg: SVGSVGElement, entityId: string): LiveLink[] {
  const escaped = CSS.escape(entityId);
  const candidates = svg.querySelectorAll<SVGPathElement>(`path[data-sf-from="${escaped}"], path[data-sf-to="${escaped}"]`);
  const links: LiveLink[] = [];
  candidates.forEach(path => {
    const draggedIsFrom = path.getAttribute('data-sf-from') === entityId;
    const otherId = draggedIsFrom ? path.getAttribute('data-sf-to') : path.getAttribute('data-sf-from');
    if (!otherId) return;
    const otherPrimary = findOwnerNode(svg, otherId, isPrimary);
    if (!otherPrimary) return;
    links.push({
      path,
      pathType: (path.getAttribute('data-sf-route') as PathType | null) ?? 'straight',
      fromSide: path.getAttribute('data-sf-from-side') as Side | null,
      toSide: path.getAttribute('data-sf-to-side') as Side | null,
      otherBounds: otherPrimary.getBBox(),
      draggedIsFrom,
      strokeWidth: Number(path.getAttribute('stroke-width')) || 2,
    });
  });
  return links;
}

interface DragState {
  owner: OwnerRef;
  nodes: SVGGraphicsElement[];
  baseTransforms: (string | null)[];
  overlay: SVGGElement | null;
  overlayBaseTransform: string | null;
  draggedBounds: Bounds;
  liveLinks: LiveLink[];
  pointerId: number;
  startScreen: { x: number; y: number };
  startUser: { x: number; y: number };
  moved: boolean;
}

export function bindShapeMovement(viewer: Viewer, emitter: Emitter): MoveDragHandle {
  const svg = viewer.svg;
  let drag: DragState | null = null;

  const userPoint = (e: PointerEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const applyTransform = (dx: number, dy: number) => {
    if (!drag) return;
    drag.nodes.forEach((node, i) => {
      const base = drag!.baseTransforms[i];
      node.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
    });
    if (drag.overlay) {
      const base = drag.overlayBaseTransform;
      drag.overlay.setAttribute('transform', base ? `translate(${dx} ${dy}) ${base}` : `translate(${dx} ${dy})`);
    }
    const draggedLive = offsetBounds(drag.draggedBounds, dx, dy);
    drag.liveLinks.forEach(link => {
      const fromBounds = link.draggedIsFrom ? draggedLive : link.otherBounds;
      const toBounds = link.draggedIsFrom ? link.otherBounds : draggedLive;
      const from = anchorPoint(fromBounds, link.fromSide);
      const to = anchorPoint(toBounds, link.toSide);
      // getPathPoints only ever reads fromPoint/toPoint/waypoints/segmentOffsets
      // off this — the rest of Link is irrelevant busywork just to satisfy the type.
      const fakeLink: Link = {
        id: 'preview', fromId: '', toId: '', layer_group: '', order_key: '', is_visible: true, is_locked: false,
        fromPoint: link.fromSide ? { side: link.fromSide, offset: 0.5 } : undefined,
        toPoint: link.toSide ? { side: link.toSide, offset: 0.5 } : undefined,
      };
      const { points, segments } = getPathPoints(fakeLink, from, to, link.pathType);
      link.path.setAttribute('d', previewPathData(points, segments, link.pathType, link.strokeWidth));
    });
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    const owner = resolveOwner(e.target as Element | null);
    if (!owner || !MOVABLE_ROLES.has(owner.role)) return;
    const nodes = findAllOwnerNodes(svg, owner.id);
    const primary = findOwnerNode(svg, owner.id, isPrimary);
    if (!nodes.length || !primary) return;
    const overlay = svg.querySelector<SVGGElement>(`[data-sf-selection-overlay="${CSS.escape(owner.id)}"]`);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag = {
      owner,
      nodes,
      baseTransforms: nodes.map(n => n.getAttribute('transform')),
      overlay,
      overlayBaseTransform: overlay?.getAttribute('transform') ?? null,
      draggedBounds: primary.getBBox(),
      liveLinks: findLiveLinks(svg, owner.id),
      pointerId: e.pointerId,
      startScreen: { x: e.clientX, y: e.clientY },
      startUser: userPoint(e),
      moved: false,
    };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      const screenDist = Math.hypot(e.clientX - drag.startScreen.x, e.clientY - drag.startScreen.y);
      if (screenDist < SCREEN_DRAG_THRESHOLD) return;
      drag.moved = true;
    }
    const p = userPoint(e);
    applyTransform(p.x - drag.startUser.x, p.y - drag.startUser.y);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    (e.target as Element).releasePointerCapture?.(d.pointerId);
    if (!d.moved) return;
    const p = userPoint(e);
    emitter.emit('moveChange', { owner: d.owner, dx: p.x - d.startUser.x, dy: p.y - d.startUser.y });
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
