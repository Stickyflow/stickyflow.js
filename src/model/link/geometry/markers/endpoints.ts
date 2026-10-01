import type { PathType } from '../../types';
import { getArrowPoints } from './arrowPoints';
import type { MarkerPoint } from './types';

export function getActualArrowEndpoints(
  points: number[],
  pathType: PathType,
  from: MarkerPoint,
  to: MarkerPoint,
): { actualFrom: MarkerPoint; actualTo: MarkerPoint } {
  const forwardArrow = getArrowPoints(points, pathType, 'forward', from, to);
  const backwardArrow = getArrowPoints(points, pathType, 'backward', from, to);
  return {
    actualFrom: { x: backwardArrow[2], y: backwardArrow[3] },
    actualTo: { x: forwardArrow[2], y: forwardArrow[3] },
  };
}
