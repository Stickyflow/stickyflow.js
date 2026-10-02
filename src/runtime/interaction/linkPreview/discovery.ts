import type { Rect, Side } from '../../../model/geometry/types';
import type { PathType } from '../../../model/link';
import { findOwnerNode, isPrimary } from '../../dom';
import { routePreviewLink } from './geometry';
import type { LiveLink } from './types';

interface OppositeEndpoint {
  draggedIsFrom: boolean;
  bounds: Rect;
}

interface LiveLinkDraft {
  path: SVGPathElement;
  pathType: PathType;
  fromSide: Side | null;
  toSide: Side | null;
  otherBounds: Rect;
  draggedIsFrom: boolean;
  strokeWidth: number;
}

interface LiveLinkLabelCapture {
  labelText: SVGTextElement | null;
  initialMidpoint: { x: number; y: number } | null;
  labelGapSize: { width: number; height: number } | null;
}

function discoverLiveLink(
  svg: SVGSVGElement,
  path: SVGPathElement,
  canvasObjectId: string,
  draggedBounds: Rect,
): LiveLink | null {
  const draft = createLiveLinkDraft(svg, path, canvasObjectId);
  if (!draft) {
    return null;
  }
  return { ...draft, ...captureLiveLinkLabel(svg, draft, draggedBounds) };
}

function createLiveLinkDraft(svg: SVGSVGElement, path: SVGPathElement, canvasObjectId: string): LiveLinkDraft | null {
  const oppositeEndpoint = resolveOppositeEndpoint(svg, path, canvasObjectId);
  if (!oppositeEndpoint) {
    return null;
  }
  return {
    path,
    pathType: (path.getAttribute('data-sf-route') as PathType | null) ?? 'straight',
    fromSide: path.getAttribute('data-sf-from-side') as Side | null,
    toSide: path.getAttribute('data-sf-to-side') as Side | null,
    otherBounds: oppositeEndpoint.bounds,
    draggedIsFrom: oppositeEndpoint.draggedIsFrom,
    strokeWidth: Number(path.getAttribute('stroke-width')) || 2,
  };
}

function resolveOppositeEndpoint(
  svg: SVGSVGElement,
  path: SVGPathElement,
  canvasObjectId: string,
): OppositeEndpoint | null {
  const draggedIsFrom = path.getAttribute('data-sf-from') === canvasObjectId;
  const otherId = path.getAttribute(draggedIsFrom ? 'data-sf-to' : 'data-sf-from');
  if (!otherId) {
    return null;
  }
  const otherPrimary = findOwnerNode(svg, otherId, isPrimary);
  return otherPrimary ? { draggedIsFrom, bounds: otherPrimary.getBBox() } : null;
}

function captureLiveLinkLabel(svg: SVGSVGElement, draft: LiveLinkDraft, draggedBounds: Rect): LiveLinkLabelCapture {
  const labelText = findLinkLabel(svg, draft.path);
  if (!labelText) {
    return { labelText: null, initialMidpoint: null, labelGapSize: null };
  }
  return {
    labelText,
    initialMidpoint: initialLinkMidpoint(draft, draggedBounds),
    labelGapSize: draft.path.getAttribute('data-sf-label-gap') === 'true' ? labelText.getBBox() : null,
  };
}

function findLinkLabel(svg: SVGSVGElement, path: SVGPathElement): SVGTextElement | null {
  const linkId = path.getAttribute('data-sf-id');
  return linkId ? svg.querySelector<SVGTextElement>(`text[data-sf-id="${CSS.escape(linkId)}"]`) : null;
}

function initialLinkMidpoint(draft: LiveLinkDraft, draggedBounds: Rect): { x: number; y: number } {
  const fromBounds = draft.draggedIsFrom ? draggedBounds : draft.otherBounds;
  const toBounds = draft.draggedIsFrom ? draft.otherBounds : draggedBounds;
  return routePreviewLink(fromBounds, toBounds, draft.fromSide, draft.toSide, draft.pathType).midpoint;
}

export function findLiveLinks(svg: SVGSVGElement, canvasObjectId: string, draggedBounds: Rect): LiveLink[] {
  const escapedId = CSS.escape(canvasObjectId);
  const candidates = svg.querySelectorAll<SVGPathElement>(
    `path[data-sf-from="${escapedId}"], path[data-sf-to="${escapedId}"]`,
  );
  const links: LiveLink[] = [];
  for (const path of candidates) {
    const link = discoverLiveLink(svg, path, canvasObjectId, draggedBounds);
    if (link) {
      links.push(link);
    }
  }
  return links;
}
