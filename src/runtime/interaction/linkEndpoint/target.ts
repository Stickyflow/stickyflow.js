import { type LinkTarget, resolveLinkTarget } from '../linkGhost/target';
import type { LinkEndpointDragState } from './state';

export type EndpointTarget = LinkTarget;

export function resolveEndpointTarget(
  drag: LinkEndpointDragState,
  point: { x: number; y: number },
  unitsPerPx: number,
): EndpointTarget {
  const target = resolveLinkTarget(drag.candidates, drag.fixedPoint, point, unitsPerPx);
  drag.hit = target.hit;
  return target;
}
