// Shared by moveDrag.ts and resizeDrag.ts: live-routes an entity's attached
// links through the real router (model/geometry/) while it's mid-drag,
// reusing whatever bounds the caller currently has for the dragged end (a
// translated copy while moving, a resized one while resizing) — this module
// doesn't care which, it only needs "the dragged shape's bounds right now"
// plus each link's cached static (non-dragged) endpoint.
import { findOwnerNode, isPrimary } from '../viewer/domQuery';
import { getPathPoints, getLineMidpoint, labelGapDash, roundedOrthogonalPathData } from '../model/geometry/connectionLine';
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
  /** This link's text label, if it has one — buildLink() gives it the same
   *  data-sf-id as the path, so it's found the same way. null for links with
   *  no text (most of the time). */
  labelText: SVGTextElement | null;
  /** The label's midpoint before this gesture started, computed the exact same
   *  way (getPathPoints + getLineMidpoint) as every live update below — so the
   *  per-update delta cancels out any constant offset between this estimate and
   *  the renderer's own, rather than requiring them to match exactly. */
  initialMidpoint: { x: number; y: number } | null;
  /** The label's own rendered footprint (getBBox(), captured before this
   *  gesture moves anything) — reused every frame to recompute where the
   *  line's stroke-dasharray gap should sit, so the gap tracks the drag
   *  instead of freezing at its pre-drag position until the gesture commits
   *  and a full re-render catches it up. null when the static renderer didn't
   *  cut a gap for this link (no label, or a dashed/dotted stroke style that
   *  already owns the dasharray — see buildRenderScene.ts's buildLink). */
  labelGapSize: { width: number; height: number } | null;
}

/** getPathPoints only ever reads fromPoint/toPoint/waypoints/segmentOffsets off
 *  this — the rest of Link is irrelevant busywork just to satisfy the type. */
function routeBetween(fromBounds: Bounds, toBounds: Bounds, fromSide: Side | null, toSide: Side | null, pathType: PathType) {
  const from = anchorPoint(fromBounds, fromSide);
  const to = anchorPoint(toBounds, toSide);
  const fakeLink: Link = {
    id: 'preview', fromId: '', toId: '', layer_group: '', order_key: '', is_visible: true, is_locked: false,
    fromPoint: fromSide ? { side: fromSide, offset: 0.5 } : undefined,
    toPoint: toSide ? { side: toSide, offset: 0.5 } : undefined,
  };
  const { points, segments } = getPathPoints(fakeLink, from, to, pathType);
  return { points, segments, midpoint: getLineMidpoint(points, pathType, from, to) };
}

/** Links attached to `entityId`, live-routed through the real router while
 *  dragging — every route type, not just straight/curved: orthogonal is
 *  SFL's *default* pathType when a link doesn't set `route:` explicitly, so
 *  most real diagrams would otherwise show none of their links tracking the
 *  drag at all. `draggedBounds` is the dragged entity's OWN bounds right now,
 *  before this gesture moves it — needed to compute where the label sits
 *  before the drag, so later updates can move it by the same delta the path
 *  itself moves by. */
export function findLiveLinks(svg: SVGSVGElement, entityId: string, draggedBounds: Bounds): LiveLink[] {
  const escaped = CSS.escape(entityId);
  const candidates = svg.querySelectorAll<SVGPathElement>(`path[data-sf-from="${escaped}"], path[data-sf-to="${escaped}"]`);
  const links: LiveLink[] = [];
  candidates.forEach(path => {
    const draggedIsFrom = path.getAttribute('data-sf-from') === entityId;
    const otherId = draggedIsFrom ? path.getAttribute('data-sf-to') : path.getAttribute('data-sf-from');
    if (!otherId) return;
    const otherPrimary = findOwnerNode(svg, otherId, isPrimary);
    if (!otherPrimary) return;
    const pathType = (path.getAttribute('data-sf-route') as PathType | null) ?? 'straight';
    const fromSide = path.getAttribute('data-sf-from-side') as Side | null;
    const toSide = path.getAttribute('data-sf-to-side') as Side | null;
    const otherBounds = otherPrimary.getBBox();

    const linkId = path.getAttribute('data-sf-id');
    const labelText = linkId ? svg.querySelector<SVGTextElement>(`text[data-sf-id="${CSS.escape(linkId)}"]`) : null;
    const initialMidpoint = labelText
      ? routeBetween(draggedIsFrom ? draggedBounds : otherBounds, draggedIsFrom ? otherBounds : draggedBounds, fromSide, toSide, pathType).midpoint
      : null;
    const labelGapSize = labelText && path.getAttribute('data-sf-label-gap') === 'true' ? labelText.getBBox() : null;

    links.push({
      path, pathType, fromSide, toSide, otherBounds, draggedIsFrom,
      strokeWidth: Number(path.getAttribute('stroke-width')) || 2,
      labelText, initialMidpoint, labelGapSize,
    });
  });
  return links;
}

/** Re-route every live link against the dragged shape's current (in-gesture) bounds. */
export function updateLiveLinks(liveLinks: LiveLink[], draggedLiveBounds: Bounds): void {
  liveLinks.forEach(link => {
    const fromBounds = link.draggedIsFrom ? draggedLiveBounds : link.otherBounds;
    const toBounds = link.draggedIsFrom ? link.otherBounds : draggedLiveBounds;
    const { points, segments, midpoint } = routeBetween(fromBounds, toBounds, link.fromSide, link.toSide, link.pathType);
    link.path.setAttribute('d', previewPathData(points, segments, link.pathType, link.strokeWidth));

    // Same delta the path itself just moved by, applied to the label as a
    // translate — cheaper than recomputing the wrapped/anchored x,y the static
    // renderer would (textSvg's align/verticalAlign math), and exactly as
    // correct: only the DELTA since drag-start is ever used, so a translate on
    // top of wherever the label already was lands it in the same place either way.
    if (link.labelText && link.initialMidpoint) {
      const dx = midpoint.x - link.initialMidpoint.x;
      const dy = midpoint.y - link.initialMidpoint.y;
      link.labelText.setAttribute('transform', `translate(${dx} ${dy})`);
    }

    // Re-cut the line's label gap against the live (mid-drag) path — without
    // this the gap stays wherever it was before the drag started while the
    // label above (just repositioned) moves right past it.
    if (link.labelGapSize) {
      const gap = labelGapDash(points, link.pathType, link.labelGapSize.width, link.labelGapSize.height);
      if (gap) link.path.setAttribute('stroke-dasharray', `${gap.dashBefore} ${gap.gapLength} 1000000`);
      else link.path.removeAttribute('stroke-dasharray');
    }
  });
}
