import { portToPoint } from '../../model/geometry/router';
import type { EndpointCandidate } from './candidates';
import { nearestPort, sideFromDirection } from './geometry';
import type { LinkEndpointDragState } from './state';

function contains(candidate: EndpointCandidate, point: { x: number; y: number }): boolean {
  const { bounds } = candidate;
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function hitCandidate(candidates: EndpointCandidate[], point: { x: number; y: number }): EndpointCandidate | undefined {
  return [...candidates].reverse().find(candidate => contains(candidate, point));
}

export interface EndpointTarget {
  point: { x: number; y: number };
  side: LinkEndpointDragState['fixedSide'];
}

export function resolveEndpointTarget(drag: LinkEndpointDragState, point: { x: number; y: number }): EndpointTarget {
  const candidate = hitCandidate(drag.candidates, point);
  if (!candidate) {
    drag.hit = null;
    return { point, side: sideFromDirection(drag.fixedPoint, point) };
  }

  const port = nearestPort(candidate.bounds, point);
  drag.hit = { owner: candidate.owner, side: port.side, offset: port.offset };
  return { point: portToPoint(candidate.bounds, port), side: port.side };
}
