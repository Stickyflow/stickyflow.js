// Shared by moveDrag.ts and resizeDrag.ts: live-routes an entity's attached
// links through the real router (model/geometry/) while it's mid-drag,
// reusing whatever bounds the caller currently has for the dragged end (a
// translated copy while moving, a resized one while resizing) — this module
// doesn't care which, it only needs "the dragged shape's bounds right now"
// plus each link's cached static (non-dragged) endpoint.
import { findOwnerNode, isPrimary } from '../viewer/domQuery';
import { getPathPoints, roundedOrthogonalPathData } from '../model/geometry/connectionLine';
import { portToPoint, type Side, type Bounds, type PathSegment } from '../model/geometry/router';
import type { Link, PathType } from '../model/links';

export const centerOf = (b: Bounds) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
export const anchorPoint = (b: Bounds, side: Side | null) => (side ? portToPoint(b, { side, offset: 0.5 }) : centerOf(b));

/** The exact same `d` shape the real renderer would produce for this pathType
 *  (see buildRenderScene.ts's own pathData) — including orthogonal corner
 *  rounding, via the shared roundedOrthogonalPathData, so a link doesn't
 *  visibly change corner style between "being dragged" and "just rendered". */
export function previewPathData(points: number[], segments: PathSegment[], pathType: PathType, strokeWidth: number): string {
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

export interface LiveLink {
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
 *  dragging — every route type, not just straight/curved: orthogonal is
 *  SFL's *default* pathType when a link doesn't set `route:` explicitly, so
 *  most real diagrams would otherwise show none of their links tracking the
 *  drag at all. */
export function findLiveLinks(svg: SVGSVGElement, entityId: string): LiveLink[] {
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

/** Re-route every live link against the dragged shape's current (in-gesture) bounds. */
export function updateLiveLinks(liveLinks: LiveLink[], draggedLiveBounds: Bounds): void {
  liveLinks.forEach(link => {
    const fromBounds = link.draggedIsFrom ? draggedLiveBounds : link.otherBounds;
    const toBounds = link.draggedIsFrom ? link.otherBounds : draggedLiveBounds;
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
}
