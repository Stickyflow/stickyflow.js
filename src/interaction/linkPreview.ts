import {
  getLineMidpoint,
  getPathPoints,
  labelGapDash,
  roundedOrthogonalPathData,
} from '../model/geometry/connectionLine';
import { type Bounds, type PathSegment, portToPoint, type Side } from '../model/geometry/router';
import type { Link, PathType } from '../model/links';
import { findOwnerNode, isPrimary } from '../viewer/domQuery';

export const centerOf = (b: Bounds) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
export const anchorPoint = (b: Bounds, side: Side | null) =>
  side ? portToPoint(b, { side, offset: 0.5 }) : centerOf(b);

export function previewPathData(
  points: number[],
  segments: PathSegment[],
  pathType: PathType,
  strokeWidth: number,
): string {
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
  fromSide: Side | null;
  toSide: Side | null;
  otherBounds: Bounds;
  draggedIsFrom: boolean;
  strokeWidth: number;
  labelText: SVGTextElement | null;
  initialMidpoint: { x: number; y: number } | null;
  labelGapSize: { width: number; height: number } | null;
}

function routeBetween(
  fromBounds: Bounds,
  toBounds: Bounds,
  fromSide: Side | null,
  toSide: Side | null,
  pathType: PathType,
) {
  const from = anchorPoint(fromBounds, fromSide);
  const to = anchorPoint(toBounds, toSide);
  const fakeLink: Link = {
    id: 'preview',
    fromId: '',
    toId: '',
    layer_group: '',
    order_key: '',
    is_visible: true,
    is_locked: false,
    fromPoint: fromSide ? { side: fromSide, offset: 0.5 } : undefined,
    toPoint: toSide ? { side: toSide, offset: 0.5 } : undefined,
  };
  const { points, segments } = getPathPoints(fakeLink, from, to, pathType);
  return { points, segments, midpoint: getLineMidpoint(points, pathType, from, to) };
}

export function findLiveLinks(svg: SVGSVGElement, entityId: string, draggedBounds: Bounds): LiveLink[] {
  const escaped = CSS.escape(entityId);
  const candidates = svg.querySelectorAll<SVGPathElement>(
    `path[data-sf-from="${escaped}"], path[data-sf-to="${escaped}"]`,
  );
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
      ? routeBetween(
          draggedIsFrom ? draggedBounds : otherBounds,
          draggedIsFrom ? otherBounds : draggedBounds,
          fromSide,
          toSide,
          pathType,
        ).midpoint
      : null;
    const labelGapSize = labelText && path.getAttribute('data-sf-label-gap') === 'true' ? labelText.getBBox() : null;

    links.push({
      path,
      pathType,
      fromSide,
      toSide,
      otherBounds,
      draggedIsFrom,
      strokeWidth: Number(path.getAttribute('stroke-width')) || 2,
      labelText,
      initialMidpoint,
      labelGapSize,
    });
  });
  return links;
}

export function updateLiveLinks(liveLinks: LiveLink[], draggedLiveBounds: Bounds): void {
  liveLinks.forEach(link => {
    const fromBounds = link.draggedIsFrom ? draggedLiveBounds : link.otherBounds;
    const toBounds = link.draggedIsFrom ? link.otherBounds : draggedLiveBounds;
    const { points, segments, midpoint } = routeBetween(
      fromBounds,
      toBounds,
      link.fromSide,
      link.toSide,
      link.pathType,
    );
    link.path.setAttribute('d', previewPathData(points, segments, link.pathType, link.strokeWidth));

    if (link.labelText && link.initialMidpoint) {
      const dx = midpoint.x - link.initialMidpoint.x;
      const dy = midpoint.y - link.initialMidpoint.y;
      link.labelText.setAttribute('transform', `translate(${dx} ${dy})`);
    }

    if (link.labelGapSize) {
      const gap = labelGapDash(points, link.pathType, link.labelGapSize.width, link.labelGapSize.height);
      if (gap) link.path.setAttribute('stroke-dasharray', `${gap.dashBefore} ${gap.gapLength} 1000000`);
      else link.path.removeAttribute('stroke-dasharray');
    }
  });
}
