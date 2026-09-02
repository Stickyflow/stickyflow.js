import { SIDE_N } from './internal';
import {
  chooseBend,
  chooseInitialOrientation,
  type OrthogonalRouteDraft,
  type RouteConnection,
  snapAlignedEndpoints,
  stepOutDistances,
} from './orthogonal/routePlan';
import {
  baseOrthogonalPoints,
  movableInnerSegments,
  offsetOrthogonalPoints,
  segmentMidpoints,
} from './orthogonal/routePoints';
import { describeSegments } from './orthogonal/segments';
import { roundOrthogonalPath } from './rounding';
import type { OrthoPath, Side } from './types';

export interface OrthogonalRouteRequest {
  from: { x: number; y: number };
  to: { x: number; y: number };
  fromSide: Side;
  toSide: Side;
  segmentOffsets?: number[];
  entityEdges?: { fromEdge?: Side; toEdge?: Side };
}

export function routeOrthogonal(request: OrthogonalRouteRequest): OrthoPath {
  const routeDraft = createOrthogonalRouteDraft(request);
  const bend = chooseBend(routeDraft);

  const originalPoints = baseOrthogonalPoints(routeDraft, bend);
  const originalSegmentMidpoints = segmentMidpoints(originalPoints);
  const movableSegments = movableInnerSegments(routeDraft.horizontalFirst, request.fromSide, request.toSide);
  const points = offsetOrthogonalPoints(routeDraft, bend, request.segmentOffsets, movableSegments);
  const segments = describeSegments(points, originalSegmentMidpoints, movableSegments[0], movableSegments[1]);

  return { points: roundOrthogonalPath(points, 10), segments };
}

function createOrthogonalRouteDraft(request: OrthogonalRouteRequest): OrthogonalRouteDraft {
  const [alignedFrom, alignedTo] = snapAlignedEndpoints(request.from, request.to, request.fromSide, request.toSide);
  const fromNormal = SIDE_N[request.fromSide];
  const toNormal = SIDE_N[request.toSide];
  const horizontalFirst = chooseInitialOrientation(alignedFrom, alignedTo, request.entityEdges);
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
  point: { x: number; y: number },
  side: Side,
  normal: [number, number],
  distance: number,
): RouteConnection {
  return {
    side,
    normal,
    stub: [point.x + normal[0] * distance, point.y + normal[1] * distance],
  };
}
