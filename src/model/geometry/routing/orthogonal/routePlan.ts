import type { Point } from '../../types';
import type { Side } from '../types';

export type RoutePoint = Point;

export interface RouteConnection {
  side: Side;
  normal: [number, number];
  stub: [number, number];
}

export interface OrthogonalRouteDraft {
  from: RoutePoint;
  to: RoutePoint;
  fromConnection: RouteConnection;
  toConnection: RouteConnection;
  horizontalFirst: boolean;
}

export function snapAlignedEndpoints(
  from: RoutePoint,
  to: RoutePoint,
  fromSide: Side,
  toSide: Side,
): [RoutePoint, RoutePoint] {
  const threshold = 6;
  const verticalPair = ['top', 'bottom'].includes(fromSide) && ['top', 'bottom'].includes(toSide);
  const horizontalPair = ['left', 'right'].includes(fromSide) && ['left', 'right'].includes(toSide);

  if (verticalPair && Math.abs(to.x - from.x) < threshold) {
    return [from, { ...to, x: from.x }];
  }
  if (horizontalPair && Math.abs(to.y - from.y) < threshold) {
    return [from, { ...to, y: from.y }];
  }
  return [from, to];
}

export function chooseInitialOrientation(
  from: RoutePoint,
  to: RoutePoint,
  entityEdges?: { fromEdge?: Side; toEdge?: Side },
): boolean {
  if (entityEdges?.toEdge) {
    return entityEdges.toEdge === 'left' || entityEdges.toEdge === 'right';
  }
  if (entityEdges?.fromEdge) {
    return entityEdges.fromEdge === 'left' || entityEdges.fromEdge === 'right';
  }
  return Math.abs(to.x - from.x) > Math.abs(to.y - from.y);
}

export function stepOutDistances(
  from: RoutePoint,
  to: RoutePoint,
  fromNormal: [number, number],
  toNormal: [number, number],
  horizontalFirst: boolean,
): [number, number] {
  let fromDistance = 40;
  let toDistance = 40;
  const axis = horizontalFirst ? 0 : 1;
  const delta = horizontalFirst ? to.x - from.x : to.y - from.y;

  if (fromNormal[axis] !== 0 && fromNormal[axis] === -toNormal[axis]) {
    const gap = delta * fromNormal[axis];
    if (gap > 0 && gap < fromDistance + toDistance) {
      fromDistance = gap / 2;
      toDistance = gap / 2;
    }
  } else if (fromNormal[axis] === 0) {
    const gap = delta * -toNormal[axis];
    if (gap > 0 && gap < toDistance) {
      toDistance = gap;
    }
  }

  return [fromDistance, toDistance];
}

export function chooseBend(route: OrthogonalRouteDraft): [number, number] {
  const { fromConnection, toConnection, to, horizontalFirst } = route;
  const fromStub = fromConnection.stub;
  const toStub = toConnection.stub;
  let x = (fromStub[0] + toStub[0]) / 2;
  let y = (fromStub[1] + toStub[1]) / 2;
  const fromHorizontal = isHorizontalSide(fromConnection.side);
  const toHorizontal = isHorizontalSide(toConnection.side);

  if (fromHorizontal !== toHorizontal) {
    if (horizontalFirst) {
      x = (fromStub[0] - to.x) * toConnection.normal[0] >= 0 ? fromStub[0] : toStub[0];
    } else {
      y = (fromStub[1] - to.y) * toConnection.normal[1] >= 0 ? fromStub[1] : toStub[1];
    }
  } else if (fromConnection.side === toConnection.side) {
    if (horizontalFirst) {
      x = fromConnection.normal[0] < 0 ? Math.min(fromStub[0], toStub[0]) : Math.max(fromStub[0], toStub[0]);
    } else {
      y = fromConnection.normal[1] < 0 ? Math.min(fromStub[1], toStub[1]) : Math.max(fromStub[1], toStub[1]);
    }
  }

  return [x, y];
}

function isHorizontalSide(side: Side): boolean {
  return side === 'left' || side === 'right';
}
