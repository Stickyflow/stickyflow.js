import { portToPoint } from '../../model/geometry/router';
import { nearestPort, sideFromDirection } from '../linkEndpoint/geometry';
import type { DuplicateCandidate, QuickDuplicateDragState } from './state';

function contains(candidate: DuplicateCandidate, point: { x: number; y: number }): boolean {
  const { bounds } = candidate;
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function resolveDuplicateTarget(
  drag: QuickDuplicateDragState,
  point: { x: number; y: number },
): { point: { x: number; y: number }; side: QuickDuplicateDragState['direction'] } {
  const candidate = [...drag.candidates].reverse().find(item => contains(item, point));
  if (!candidate) {
    drag.hit = null;
    return { point, side: sideFromDirection(drag.fixedPoint, point) };
  }

  const port = nearestPort(candidate.bounds, point);
  drag.hit = { owner: candidate.owner, side: port.side, offset: port.offset };
  return { point: portToPoint(candidate.bounds, port), side: port.side };
}
