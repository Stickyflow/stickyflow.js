import type { Side } from '../../../../../model/geometry/types';
import type { OrthogonalRouteDraft } from './orthogonalPlan';
import type { LinkRoutePoint } from './types';

export function segmentMidpoints(points: number[]): LinkRoutePoint[] {
  const midpoints: LinkRoutePoint[] = [];
  for (let index = 0; index < points.length - 2; index += 2) {
    midpoints.push({
      x: (points[index] + points[index + 2]) / 2,
      y: (points[index + 1] + points[index + 3]) / 2,
    });
  }
  return midpoints;
}

export function baseOrthogonalPoints(route: OrthogonalRouteDraft, bend: [number, number]): number[] {
  const { from, to, fromConnection, toConnection, horizontalFirst } = route;
  const fromStub = fromConnection.stub;
  const toStub = toConnection.stub;
  const points = [from.x, from.y, fromStub[0], fromStub[1]];
  if (horizontalFirst) {
    points.push(bend[0], fromStub[1], bend[0], toStub[1]);
  } else {
    points.push(fromStub[0], bend[1], toStub[0], bend[1]);
  }
  points.push(toStub[0], toStub[1], to.x, to.y);
  return points;
}

export function movableInnerSegments(horizontalFirst: boolean, fromSide: Side, toSide: Side): [boolean, boolean] {
  const fixedSides = horizontalFirst ? ['left', 'right'] : ['top', 'bottom'];
  return [!fixedSides.includes(fromSide), !fixedSides.includes(toSide)];
}

export function offsetOrthogonalPoints(
  route: OrthogonalRouteDraft,
  bend: [number, number],
  segmentOffsets: number[] | undefined,
  movable: [boolean, boolean],
): number[] {
  const { from, to, fromConnection, toConnection, horizontalFirst } = route;
  const fromStub = fromConnection.stub;
  const toStub = toConnection.stub;
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
