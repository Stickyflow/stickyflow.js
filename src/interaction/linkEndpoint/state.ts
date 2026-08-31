import { type Bounds, chooseSide, type Side } from '../../model/geometry/router';
import type { PathType } from '../../model/links';
import type { OwnerRef } from '../../viewer';
import { resolveOwner } from '../../viewer/contract';
import { findOwnerNode, isPrimary } from '../../viewer/domQuery';
import type { LinkEndpoint } from '../../viewer/selectionOverlay';

export interface EndpointCandidate {
  owner: OwnerRef;
  bounds: Bounds;
}

export interface LinkEndpointDragState {
  linkOwner: OwnerRef;
  end: LinkEndpoint;
  path: SVGPathElement;
  pathType: PathType;
  strokeWidth: number;
  originalD: string;
  fixedPoint: { x: number; y: number };
  fixedSide: Side;
  candidates: EndpointCandidate[];
  pointerId: number;
  startScreen: { x: number; y: number };
  moved: boolean;
  hit: { owner: OwnerRef; side: Side; offset: number } | null;
}

function endpointCandidates(svg: SVGSVGElement): EndpointCandidate[] {
  const candidates: EndpointCandidate[] = [];
  for (const element of svg.querySelectorAll<SVGGraphicsElement>('[data-sf-primary]')) {
    if (element.getAttribute('data-sf-role') === 'link') {
      continue;
    }
    const owner = resolveOwner(element);
    if (owner) {
      candidates.push({ owner, bounds: element.getBBox() });
    }
  }
  return candidates;
}

export function createLinkEndpointDragState(svg: SVGSVGElement, event: PointerEvent): LinkEndpointDragState | null {
  const target = event.target as Element | null;
  const end = target?.closest('[data-sf-link-endpoint]')?.getAttribute('data-sf-link-endpoint') as
    | LinkEndpoint
    | null
    | undefined;
  const overlay = target?.closest('[data-sf-selection-overlay]');
  const linkId = overlay?.getAttribute('data-sf-selection-overlay');
  if (!end || !linkId) {
    return null;
  }

  const path = findOwnerNode(svg, linkId, isPrimary) as unknown as SVGPathElement | null;
  const linkOwner = path && resolveOwner(path);
  if (!path || !linkOwner) {
    return null;
  }

  const fromId = path.getAttribute('data-sf-from');
  const toId = path.getAttribute('data-sf-to');
  const otherId = end === 'from' ? toId : fromId;
  const otherPrimary = otherId ? findOwnerNode(svg, otherId, isPrimary) : null;
  if (!otherPrimary) {
    return null;
  }

  const length = path.getTotalLength();
  const fixedPoint = end === 'from' ? path.getPointAtLength(length) : path.getPointAtLength(0);
  const fixedSideAttribute = (
    end === 'from' ? path.getAttribute('data-sf-to-side') : path.getAttribute('data-sf-from-side')
  ) as Side | null;
  const draggedId = end === 'from' ? fromId : toId;
  const draggedPrimary = draggedId ? findOwnerNode(svg, draggedId, isPrimary) : null;
  const fixedSide =
    fixedSideAttribute ?? (draggedPrimary ? chooseSide(otherPrimary.getBBox(), draggedPrimary.getBBox()) : 'right');

  target?.setPointerCapture?.(event.pointerId);
  return {
    linkOwner,
    end,
    path,
    pathType: (path.getAttribute('data-sf-route') as PathType | null) ?? 'straight',
    strokeWidth: Number(path.getAttribute('stroke-width')) || 2,
    originalD: path.getAttribute('d') ?? '',
    fixedPoint: { x: fixedPoint.x, y: fixedPoint.y },
    fixedSide,
    candidates: endpointCandidates(svg),
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    moved: false,
    hit: null,
  };
}
