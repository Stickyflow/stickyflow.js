import type { Link } from '../../../links';
import { routeOrthogonal, type Side } from '../../router';
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
  const route = routeOrthogonal(from, to, fromSide, toSide, link.segmentOffsets, entityEdges);
  if (isAxisAligned(route.segments)) {
    return route;
  }
  return routeOrthogonal(from, to, fromSide, toSide, undefined, entityEdges);
}
