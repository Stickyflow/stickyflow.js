import { SIDE_N } from './internal';
import { chooseBend, chooseInitialOrientation, snapAlignedEndpoints, stepOutDistances } from './orthogonal/routePlan';
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
  [from, to] = snapAlignedEndpoints(from, to, fromSide, toSide);

  const fromNormal = SIDE_N[fromSide];
  const toNormal = SIDE_N[toSide];
  const horizontalFirst = chooseInitialOrientation(from, to, entityEdges);
  const [fromDistance, toDistance] = stepOutDistances(from, to, fromNormal, toNormal, horizontalFirst);
  const fromStub: [number, number] = [from.x + fromNormal[0] * fromDistance, from.y + fromNormal[1] * fromDistance];
  const toStub: [number, number] = [to.x + toNormal[0] * toDistance, to.y + toNormal[1] * toDistance];
  const bend = chooseBend(fromStub, toStub, to, fromSide, toSide, fromNormal, toNormal, horizontalFirst);

  const originalPoints = baseOrthogonalPoints(from, to, fromStub, toStub, bend, horizontalFirst);
  const originalSegmentMidpoints = segmentMidpoints(originalPoints);
  const movableSegments = movableInnerSegments(horizontalFirst, fromSide, toSide);
  const points = offsetOrthogonalPoints(
    from,
    to,
    fromStub,
    toStub,
    bend,
    horizontalFirst,
    segmentOffsets,
    movableSegments,
  );
  const segments = describeSegments(points, originalSegmentMidpoints, movableSegments[0], movableSegments[1]);

  return { points: roundOrthogonalPath(points, 10), segments };
}
