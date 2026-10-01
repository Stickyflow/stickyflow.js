import { routeOrthogonal, type Side } from '../../../geometry/routing';
import type { Link } from '../../types';
import type { ConnectionPoint, PathPointsResult } from './types';
import { isAxisAligned, pathFromWaypoints } from './waypoints';

export function orthogonalPath(
  link: Link,
  from: ConnectionPoint,
  to: ConnectionPoint,
  fromSide: Side,
  toSide: Side,
): PathPointsResult {
  if (link.waypoints && link.waypoints.length > 0) {
    const waypointResult = pathFromWaypoints(from, link.waypoints, to);
    if (isAxisAligned(waypointResult.segments)) {
      return waypointResult;
    }
  }

  const entityEdges = { fromEdge: fromSide, toEdge: toSide };
  const request = { from, to, fromSide, toSide, segmentOffsets: link.segmentOffsets, entityEdges };
  const route = routeOrthogonal(request);
  if (isAxisAligned(route.segments)) {
    return route;
  }
  return routeOrthogonal({ ...request, segmentOffsets: undefined });
}
