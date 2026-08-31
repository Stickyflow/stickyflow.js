import type { OrthoPath, PathSegment, Side } from './types'
import { SIDE_N } from './internal'
import { roundOrthogonalPath } from './rounding'

type Point = { x: number; y: number };

function snapAlignedEndpoints(from: Point, to: Point, fromSide: Side, toSide: Side): [Point, Point] {
  const threshold = 6;
  const verticalPair = ['top', 'bottom'].includes(fromSide) && ['top', 'bottom'].includes(toSide);
  const horizontalPair = ['left', 'right'].includes(fromSide) && ['left', 'right'].includes(toSide);

  if (verticalPair && Math.abs(to.x - from.x) < threshold) return [from, { ...to, x: from.x }];
  if (horizontalPair && Math.abs(to.y - from.y) < threshold) return [from, { ...to, y: from.y }];
  return [from, to];
}

function chooseInitialOrientation(from: Point, to: Point, entityEdges?: { fromEdge?: Side; toEdge?: Side }): boolean {
  if (entityEdges?.toEdge) return entityEdges.toEdge === 'left' || entityEdges.toEdge === 'right';
  if (entityEdges?.fromEdge) return entityEdges.fromEdge === 'left' || entityEdges.fromEdge === 'right';
  return Math.abs(to.x - from.x) > Math.abs(to.y - from.y);
}

function stepOutDistances(
  from: Point,
  to: Point,
  fromNormal: [number, number],
  toNormal: [number, number],
  horizontalFirst: boolean,
): [number, number] {
  let fromDistance = 40;
  let toDistance = 40;
  const axis = horizontalFirst ? 0 : 1;
  const delta = (horizontalFirst ? to.x - from.x : to.y - from.y);

  if (fromNormal[axis] !== 0 && fromNormal[axis] === -toNormal[axis]) {
    const gap = delta * fromNormal[axis];
    if (gap > 0 && gap < fromDistance + toDistance) {
      fromDistance = gap / 2;
      toDistance = gap / 2;
    }
  } else if (fromNormal[axis] === 0) {
    const gap = delta * -toNormal[axis];
    if (gap > 0 && gap < toDistance) toDistance = gap;
  }

  return [fromDistance, toDistance];
}

function chooseBend(
  fromStub: [number, number],
  toStub: [number, number],
  to: Point,
  fromSide: Side,
  toSide: Side,
  fromNormal: [number, number],
  toNormal: [number, number],
  horizontalFirst: boolean,
): [number, number] {
  let x = (fromStub[0] + toStub[0]) / 2;
  let y = (fromStub[1] + toStub[1]) / 2;
  const fromHorizontal = fromSide === 'left' || fromSide === 'right';
  const toHorizontal = toSide === 'left' || toSide === 'right';

  if (fromHorizontal !== toHorizontal) {
    if (horizontalFirst) {
      x = (fromStub[0] - to.x) * toNormal[0] >= 0 ? fromStub[0] : toStub[0];
    } else {
      y = (fromStub[1] - to.y) * toNormal[1] >= 0 ? fromStub[1] : toStub[1];
    }
  } else if (fromSide === toSide) {
    if (horizontalFirst) {
      x = fromNormal[0] < 0 ? Math.min(fromStub[0], toStub[0]) : Math.max(fromStub[0], toStub[0]);
    } else {
      y = fromNormal[1] < 0 ? Math.min(fromStub[1], toStub[1]) : Math.max(fromStub[1], toStub[1]);
    }
  }

  return [x, y];
}

function segmentMidpoints(points: number[]): Point[] {
  const midpoints: Point[] = [];
  for (let index = 0; index < points.length - 2; index += 2) {
    midpoints.push({
      x: (points[index] + points[index + 2]) / 2,
      y: (points[index + 1] + points[index + 3]) / 2,
    });
  }
  return midpoints;
}

function baseOrthogonalPoints(
  from: Point,
  to: Point,
  fromStub: [number, number],
  toStub: [number, number],
  bend: [number, number],
  horizontalFirst: boolean,
): number[] {
  const points = [from.x, from.y, fromStub[0], fromStub[1]];
  if (horizontalFirst) {
    points.push(bend[0], fromStub[1], bend[0], toStub[1]);
  } else {
    points.push(fromStub[0], bend[1], toStub[0], bend[1]);
  }
  points.push(toStub[0], toStub[1], to.x, to.y);
  return points;
}

function movableInnerSegments(horizontalFirst: boolean, fromSide: Side, toSide: Side): [boolean, boolean] {
  const fixedSides = horizontalFirst ? ['left', 'right'] : ['top', 'bottom'];
  return [!fixedSides.includes(fromSide), !fixedSides.includes(toSide)];
}

function offsetOrthogonalPoints(
  from: Point,
  to: Point,
  fromStub: [number, number],
  toStub: [number, number],
  bend: [number, number],
  horizontalFirst: boolean,
  segmentOffsets: number[] | undefined,
  movable: [boolean, boolean],
): number[] {
  const first = movable[0] ? segmentOffsets?.[1] || 0 : 0;
  const middle = segmentOffsets?.[2] || 0;
  const last = movable[1] ? segmentOffsets?.[3] || 0 : 0;

  if (horizontalFirst) {
    const fromY = fromStub[1] + first;
    const bendX = bend[0] + middle;
    const toY = toStub[1] + last;
    return [from.x, from.y, fromStub[0], fromY, bendX, fromY, bendX, toY, toStub[0], toY, to.x, to.y];
  }

  const fromX = fromStub[0] + first;
  const bendY = bend[1] + middle;
  const toX = toStub[0] + last;
  return [from.x, from.y, fromX, fromStub[1], fromX, bendY, toX, bendY, toX, toStub[1], to.x, to.y];
}

function describeSegments(
  points: number[],
  originalMidpoints: Point[],
  canMoveFirstInner: boolean,
  canMoveLastInner: boolean,
): PathSegment[] {
  const totalSegments = (points.length - 2) / 2;
  return originalMidpoints.map((originalMidpoint, segmentIndex) => {
    const offset = segmentIndex * 2;
    const start = { x: points[offset], y: points[offset + 1] };
    const end = { x: points[offset + 2], y: points[offset + 3] };
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const isInner = segmentIndex > 0 && segmentIndex < totalSegments - 1;
    const isMovableEdge = segmentIndex === 1
      ? canMoveFirstInner
      : segmentIndex === totalSegments - 2
        ? canMoveLastInner
        : true;
    const hasLength = Math.hypot(end.x - start.x, end.y - start.y) >= 1;

    return {
      start,
      end,
      midpoint,
      originalMidpoint,
      isHorizontal: Math.abs(end.x - start.x) > Math.abs(end.y - start.y),
      canMove: isInner && isMovableEdge && hasLength,
    };
  });
}

/** Build an orthogonal path and the segment metadata used by drag handles. */
export function routeOrthogonal(
  from:{x:number;y:number}, to:{x:number;y:number},
  fromSide: Side, toSide: Side,
  segmentOffsets?: number[], //  Array of perpendicular offsets, one per movable segment
  entityEdges?: { fromEdge?: Side; toEdge?: Side } //  Entity edges for forced orientation
): OrthoPath {
  [from, to] = snapAlignedEndpoints(from, to, fromSide, toSide);

  const n0 = SIDE_N[fromSide];
  const n3 = SIDE_N[toSide];
  const horizontalFirst = chooseInitialOrientation(from, to, entityEdges);

  const [k0, k3] = stepOutDistances(from, to, n0, n3, horizontalFirst);
  const a1: [number, number] = [from.x + n0[0] * k0, from.y + n0[1] * k0];
  const b1: [number, number] = [to.x + n3[0] * k3, to.y + n3[1] * k3];
  const [midX, midY] = chooseBend(a1, b1, to, fromSide, toSide, n0, n3, horizontalFirst);
  const bend: [number, number] = [midX, midY];
  const originalPoints = baseOrthogonalPoints(from, to, a1, b1, bend, horizontalFirst);
  const originalSegmentMidpoints = segmentMidpoints(originalPoints);
  const movable = movableInnerSegments(horizontalFirst, fromSide, toSide);
  const pts = offsetOrthogonalPoints(from, to, a1, b1, bend, horizontalFirst, segmentOffsets, movable);
  const [canMoveFirstInner, canMoveLastInner] = movable;
  const segments = describeSegments(
    pts,
    originalSegmentMidpoints,
    canMoveFirstInner,
    canMoveLastInner,
  );
  
  const roundedPoints = roundOrthogonalPath(pts, 10);
  
  return { points: roundedPoints, segments };
}

