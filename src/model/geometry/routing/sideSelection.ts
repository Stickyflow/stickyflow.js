import { boundsCenter, worldToLocal } from './coordinateSpace';
import { SIDE_N } from './internal';
import type { Port, Rect, Side } from './types';

const SIDES: Side[] = ['left', 'right', 'top', 'bottom'];
const SIDE_CHANGE_HYSTERESIS = 40;

function sideScore(side: Side, vector: { x: number; y: number }): number {
  const normal = SIDE_N[side];
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
  const fromCenter = boundsCenter(from);
  const toCenter = boundsCenter(to);
  const localTarget = worldToLocal(from, toCenter);
  const localOrigin = worldToLocal(from, fromCenter);
  return {
    x: localTarget.x - localOrigin.x,
    y: localTarget.y - localOrigin.y,
  };
}

function highestScoringSide(vector: { x: number; y: number }): Side {
  return SIDES.reduce((best, candidate) => {
    return sideScore(candidate, vector) > sideScore(best, vector) ? candidate : best;
  }, 'right');
}

export function chooseSide(from: Rect, to: Rect, stickySide?: Side): Side {
  const direction = localDirection(from, to);
  const bestSide = highestScoringSide(direction);
  if (!stickySide) {
    return bestSide;
  }

  const improvement = sideScore(bestSide, direction) - sideScore(stickySide, direction);
  return improvement > SIDE_CHANGE_HYSTERESIS ? bestSide : stickySide;
}

export function recommendPort(from: Rect, to: Rect, stickyPort?: Port): Port {
  const side = chooseSide(from, to, stickyPort?.side);
  const offset = stickyPort?.side === side ? stickyPort.offset * 0.9 + 0.5 * 0.1 : 0.5;
  return { side, offset };
}
