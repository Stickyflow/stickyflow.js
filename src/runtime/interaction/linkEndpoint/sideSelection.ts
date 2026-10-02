import type { Rect, Side } from '../../../model/geometry/types';

const SIDES: Side[] = ['left', 'right', 'top', 'bottom'];
const SIDE_CHANGE_HYSTERESIS = 40;

function sideNormal(side: Side): [number, number] {
  switch (side) {
    case 'top':
      return [0, -1];
    case 'right':
      return [1, 0];
    case 'bottom':
      return [0, 1];
    case 'left':
      return [-1, 0];
  }
}

function sideScore(side: Side, vector: { x: number; y: number }): number {
  const normal = sideNormal(side);
  const dotProduct = normal[0] * vector.x + normal[1] * vector.y;
  const horizontalMagnitude = Math.abs(vector.x);
  const verticalMagnitude = Math.abs(vector.y);
  const axisBias =
    side === 'left' || side === 'right'
      ? horizontalMagnitude - verticalMagnitude
      : verticalMagnitude - horizontalMagnitude;
  return dotProduct + 0.5 * axisBias;
}

function localDirection(from: Rect, to: Rect): { x: number; y: number } {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const radians = (-(from.rotation ?? 0) * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const deltaX = toCenter.x - fromCenter.x;
  const deltaY = toCenter.y - fromCenter.y;
  return { x: deltaX * cosine - deltaY * sine, y: deltaX * sine + deltaY * cosine };
}

export function chooseSide(from: Rect, to: Rect, stickySide?: Side): Side {
  const direction = localDirection(from, to);
  const bestSide = SIDES.reduce((best, candidate) => {
    return sideScore(candidate, direction) > sideScore(best, direction) ? candidate : best;
  }, 'right');
  if (!stickySide) {
    return bestSide;
  }
  const improvement = sideScore(bestSide, direction) - sideScore(stickySide, direction);
  return improvement > SIDE_CHANGE_HYSTERESIS ? bestSide : stickySide;
}
