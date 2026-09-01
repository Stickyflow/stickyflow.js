import type { LinkEndpoint } from '../../domContract';
import { findOwnerNode, isPrimary } from '../../domContract';
import { chooseSide, type Side } from '../../model/geometry/router';

export interface FixedEndpoint {
  point: { x: number; y: number };
  side: Side;
}

interface FixedEndpointReference {
  fixedId: string | null;
  draggedId: string | null;
  pathPoint: DOMPoint;
  declaredSide: Side | null;
}

function referenceWhenDraggingFrom(path: SVGPathElement): FixedEndpointReference {
  return {
    fixedId: path.getAttribute('data-sf-to'),
    draggedId: path.getAttribute('data-sf-from'),
    pathPoint: path.getPointAtLength(path.getTotalLength()),
    declaredSide: path.getAttribute('data-sf-to-side') as Side | null,
  };
}

function referenceWhenDraggingTo(path: SVGPathElement): FixedEndpointReference {
  return {
    fixedId: path.getAttribute('data-sf-from'),
    draggedId: path.getAttribute('data-sf-to'),
    pathPoint: path.getPointAtLength(0),
    declaredSide: path.getAttribute('data-sf-from-side') as Side | null,
  };
}

function fixedEndpointReference(path: SVGPathElement, draggedEnd: LinkEndpoint): FixedEndpointReference {
  if (draggedEnd === 'from') {
    return referenceWhenDraggingFrom(path);
  }

  return referenceWhenDraggingTo(path);
}

function inferFixedSide(svg: SVGSVGElement, reference: FixedEndpointReference, fixedPrimary: SVGGraphicsElement): Side {
  if (reference.declaredSide) {
    return reference.declaredSide;
  }

  const draggedPrimary = reference.draggedId ? findOwnerNode(svg, reference.draggedId, isPrimary) : null;
  if (!draggedPrimary) {
    return 'right';
  }

  return chooseSide(fixedPrimary.getBBox(), draggedPrimary.getBBox());
}

export function resolveFixedEndpoint(
  svg: SVGSVGElement,
  path: SVGPathElement,
  draggedEnd: LinkEndpoint,
): FixedEndpoint | null {
  const reference = fixedEndpointReference(path, draggedEnd);
  const fixedPrimary = reference.fixedId ? findOwnerNode(svg, reference.fixedId, isPrimary) : null;
  if (!fixedPrimary) {
    return null;
  }

  return {
    point: { x: reference.pathPoint.x, y: reference.pathPoint.y },
    side: inferFixedSide(svg, reference, fixedPrimary),
  };
}
