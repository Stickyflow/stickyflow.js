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

export function routeOrthogonal(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  segmentOffsets?: number[],
  entityEdges?: { fromEdge?: Side; toEdge?: Side },
): OrthoPath {
  const routeDraft = createOrthogonalRouteDraft(from, to, fromSide, toSide, entityEdges);
  const bend = chooseBend(routeDraft);

  const originalPoints = baseOrthogonalPoints(routeDraft, bend);
  const originalSegmentMidpoints = segmentMidpoints(originalPoints);
  const movableSegments = movableInnerSegments(routeDraft.horizontalFirst, fromSide, toSide);
  const points = offsetOrthogonalPoints(routeDraft, bend, segmentOffsets, movableSegments);
  const segments = describeSegments(points, originalSegmentMidpoints, movableSegments[0], movableSegments[1]);

  return { points: roundOrthogonalPath(points, 10), segments };
}

function createOrthogonalRouteDraft(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  entityEdges?: { fromEdge?: Side; toEdge?: Side },
): OrthogonalRouteDraft {
  const [alignedFrom, alignedTo] = snapAlignedEndpoints(from, to, fromSide, toSide);
  const fromNormal = SIDE_N[fromSide];
  const toNormal = SIDE_N[toSide];
  const horizontalFirst = chooseInitialOrientation(alignedFrom, alignedTo, entityEdges);
  const [fromDistance, toDistance] = stepOutDistances(alignedFrom, alignedTo, fromNormal, toNormal, horizontalFirst);

  return {
    from: alignedFrom,
    to: alignedTo,
    fromConnection: createRouteConnection(alignedFrom, fromSide, fromNormal, fromDistance),
    toConnection: createRouteConnection(alignedTo, toSide, toNormal, toDistance),
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
