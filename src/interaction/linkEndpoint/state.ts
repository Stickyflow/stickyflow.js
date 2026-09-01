import type { LinkEndpoint } from '../../domContract';
import type { Side } from '../../model/geometry/router';
import type { PathType } from '../../model/links';
import type { OwnerRef } from '../../viewer';
import { collectEndpointCandidates, type EndpointCandidate } from './candidates';
import { resolveFixedEndpoint } from './fixedEndpoint';
import { selectLinkEndpoint } from './selection';

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

export function createLinkEndpointDragState(svg: SVGSVGElement, event: PointerEvent): LinkEndpointDragState | null {
  const selection = selectLinkEndpoint(svg, event);
  if (!selection) {
    return null;
  }

  const fixedEndpoint = resolveFixedEndpoint(svg, selection.path, selection.end);
  if (!fixedEndpoint) {
    return null;
  }

  selection.captureTarget.setPointerCapture?.(event.pointerId);
  return {
    linkOwner: selection.linkOwner,
    end: selection.end,
    path: selection.path,
    pathType: (selection.path.getAttribute('data-sf-route') as PathType | null) ?? 'straight',
    strokeWidth: Number(selection.path.getAttribute('stroke-width')) || 2,
    originalD: selection.path.getAttribute('d') ?? '',
    fixedPoint: fixedEndpoint.point,
    fixedSide: fixedEndpoint.side,
    candidates: collectEndpointCandidates(svg),
    pointerId: event.pointerId,
    startScreen: { x: event.clientX, y: event.clientY },
    moved: false,
    hit: null,
  };
}
