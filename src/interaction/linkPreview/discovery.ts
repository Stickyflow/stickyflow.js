import type { Bounds, Side } from '../../model/geometry/router';
import type { PathType } from '../../model/links';
import { findOwnerNode, isPrimary } from '../../viewer/domQuery';
import { routePreviewLink } from './geometry';
import type { LiveLink } from './types';

function discoverLiveLink(
  svg: SVGSVGElement,
  path: SVGPathElement,
  entityId: string,
  draggedBounds: Bounds,
): LiveLink | null {
  const draggedIsFrom = path.getAttribute('data-sf-from') === entityId;
  const otherId = draggedIsFrom ? path.getAttribute('data-sf-to') : path.getAttribute('data-sf-from');
  if (!otherId) {
    return null;
  }
  const otherPrimary = findOwnerNode(svg, otherId, isPrimary);
  if (!otherPrimary) {
    return null;
  }
  const pathType = (path.getAttribute('data-sf-route') as PathType | null) ?? 'straight';
  const fromSide = path.getAttribute('data-sf-from-side') as Side | null;
  const toSide = path.getAttribute('data-sf-to-side') as Side | null;
  const otherBounds = otherPrimary.getBBox();
  const linkId = path.getAttribute('data-sf-id');
  const labelText = linkId ? svg.querySelector<SVGTextElement>(`text[data-sf-id="${CSS.escape(linkId)}"]`) : null;
  const initialMidpoint = labelText
    ? routePreviewLink(
        draggedIsFrom ? draggedBounds : otherBounds,
        draggedIsFrom ? otherBounds : draggedBounds,
        fromSide,
        toSide,
        pathType,
      ).midpoint
    : null;
  const labelGapSize = labelText && path.getAttribute('data-sf-label-gap') === 'true' ? labelText.getBBox() : null;
  return {
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
  };
}

export function findLiveLinks(svg: SVGSVGElement, entityId: string, draggedBounds: Bounds): LiveLink[] {
  const escapedId = CSS.escape(entityId);
  const candidates = svg.querySelectorAll<SVGPathElement>(
    `path[data-sf-from="${escapedId}"], path[data-sf-to="${escapedId}"]`,
  );
  const links: LiveLink[] = [];
  for (const path of candidates) {
    const link = discoverLiveLink(svg, path, entityId, draggedBounds);
    if (link) {
      links.push(link);
    }
  }
  return links;
}
