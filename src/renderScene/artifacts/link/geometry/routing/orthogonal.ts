import type { Side } from '../../../../../model/geometry/types';
import {
  chooseBend,
  chooseInitialOrientation,
  type OrthogonalRouteDraft,
  type RouteConnection,
  snapAlignedEndpoints,
  stepOutDistances,
} from './orthogonalPlan';
import {
  baseOrthogonalPoints,
  movableInnerSegments,
  offsetOrthogonalPoints,
  segmentMidpoints,
} from './orthogonalPoints';
import { describeSegments } from './orthogonalSegments';
import { roundOrthogonalPoints } from './rounding';
import { sideNormal } from './sideNormal';
import type { LinkRoute, LinkRoutePoint } from './types';

interface OrthogonalRouteRequest {
  from: LinkRoutePoint;
  to: LinkRoutePoint;
  fromSide: Side;
  toSide: Side;
  segmentOffsets?: number[];
  endpointEdges?: { fromEdge?: Side; toEdge?: Side };
}

export function routeOrthogonal(request: OrthogonalRouteRequest): LinkRoute {
  const routeDraft = createOrthogonalRouteDraft(request);
  const bend = chooseBend(routeDraft);
  const originalPoints = baseOrthogonalPoints(routeDraft, bend);
  const originalSegmentMidpoints = segmentMidpoints(originalPoints);
  const movableSegments = movableInnerSegments(routeDraft.horizontalFirst, request.fromSide, request.toSide);
  const points = offsetOrthogonalPoints(routeDraft, bend, request.segmentOffsets, movableSegments);
  const segments = describeSegments(points, originalSegmentMidpoints, movableSegments[0], movableSegments[1]);
  return { points: roundOrthogonalPoints(points, 10), segments };
}

function createOrthogonalRouteDraft(request: OrthogonalRouteRequest): OrthogonalRouteDraft {
  const [alignedFrom, alignedTo] = snapAlignedEndpoints(request.from, request.to, request.fromSide, request.toSide);
  const fromNormal = sideNormal(request.fromSide);
  const toNormal = sideNormal(request.toSide);
  const horizontalFirst = chooseInitialOrientation(alignedFrom, alignedTo, request.endpointEdges);
  const [fromDistance, toDistance] = stepOutDistances(alignedFrom, alignedTo, fromNormal, toNormal, horizontalFirst);
  return {
    from: alignedFrom,
    to: alignedTo,
    fromConnection: createRouteConnection(alignedFrom, request.fromSide, fromNormal, fromDistance),
    toConnection: createRouteConnection(alignedTo, request.toSide, toNormal, toDistance),
    horizontalFirst,
  };
}

function createRouteConnection(
  point: LinkRoutePoint,
  side: Side,
  normal: [number, number],
  distance: number,
): RouteConnection {
  return { side, normal, stub: [point.x + normal[0] * distance, point.y + normal[1] * distance] };
}
