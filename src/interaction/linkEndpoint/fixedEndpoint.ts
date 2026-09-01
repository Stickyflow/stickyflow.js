import type { LinkEndpoint } from '../../domContract';
import { findOwnerNode, isPrimary } from '../../domContract';
import { chooseSide, type Side } from '../../model/geometry/router';

export interface FixedEndpoint {
  point: { x: number; y: number };
  side: Side;
}

export function resolveFixedEndpoint(
  svg: SVGSVGElement,
  path: SVGPathElement,
  draggedEnd: LinkEndpoint,
): FixedEndpoint | null {
  const fromId = path.getAttribute('data-sf-from');
  const toId = path.getAttribute('data-sf-to');
  const fixedId = draggedEnd === 'from' ? toId : fromId;
  const fixedPrimary = fixedId ? findOwnerNode(svg, fixedId, isPrimary) : null;
  if (!fixedPrimary) {
    return null;
  }

  const pathLength = path.getTotalLength();
  const pathPoint = draggedEnd === 'from' ? path.getPointAtLength(pathLength) : path.getPointAtLength(0);
  const sideAttribute = (
    draggedEnd === 'from' ? path.getAttribute('data-sf-to-side') : path.getAttribute('data-sf-from-side')
  ) as Side | null;
  const draggedId = draggedEnd === 'from' ? fromId : toId;
  const draggedPrimary = draggedId ? findOwnerNode(svg, draggedId, isPrimary) : null;
  const side =
    sideAttribute ?? (draggedPrimary ? chooseSide(fixedPrimary.getBBox(), draggedPrimary.getBBox()) : 'right');

  return {
    point: { x: pathPoint.x, y: pathPoint.y },
    side,
  };
}
