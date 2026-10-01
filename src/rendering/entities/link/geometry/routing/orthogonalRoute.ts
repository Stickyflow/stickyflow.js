import type { Side } from '../../../../../model/geometry/types';
import type { Link } from '../../../../../model/link';
import { routeOrthogonal } from './orthogonal';
import type { LinkRoute, LinkRoutePoint } from './types';
import { isAxisAligned, pathFromWaypoints } from './waypoints';

export function calculateOrthogonalLinkRoute(
  link: Link,
  from: LinkRoutePoint,
  to: LinkRoutePoint,
  fromSide: Side,
  toSide: Side,
): LinkRoute {
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
