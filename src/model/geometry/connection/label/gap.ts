import type { PathType } from '../../../links';
import { splitCurvedPath } from './curvedGap';
import { bezierArcLength, type Point, polylineLength } from './pathMetrics';
import { splitPolylinePath } from './polylineGap';
import type { LabelGapDash, LabelGapSplit } from './types';

const LABEL_GAP_PADDING = 3;
const MIN_VISIBLE_STUB = 10;

function bezierPoints(points: number[]): [Point, Point, Point, Point] {
  return [
    { x: points[0], y: points[1] },
    { x: points[2], y: points[3] },
    { x: points[4], y: points[5] },
    { x: points[6], y: points[7] },
  ];
}

function pathLength(points: number[], bezier: boolean): number {
  if (bezier) {
    return bezierArcLength(...bezierPoints(points));
  }
  return polylineLength(points);
}

export function splitPathAroundLabel(
  points: number[],
  pathType: PathType,
  gapWidth: number,
  gapHeight: number,
): LabelGapSplit | null {
  const gapHalfWidth = (gapWidth + LABEL_GAP_PADDING) / 2;
  const gapHalfHeight = (gapHeight + LABEL_GAP_PADDING) / 2;
  if (pathType === 'curved') {
    return splitCurvedPath(points, gapHalfWidth, gapHalfHeight, MIN_VISIBLE_STUB);
  }
  return splitPolylinePath(points, gapHalfWidth, gapHalfHeight, MIN_VISIBLE_STUB);
}

export function labelGapDash(
  points: number[],
  pathType: PathType,
  gapWidth: number,
  gapHeight: number,
): LabelGapDash | null {
  const split = splitPathAroundLabel(points, pathType, gapWidth, gapHeight);
  if (!split || (!split.before && !split.after)) {
    return null;
  }

  const totalLength = pathLength(points, split.bezier);
  const dashBefore = split.before ? pathLength(split.before, split.bezier) : 0;
  const afterLength = split.after ? pathLength(split.after, split.bezier) : 0;
  const gapLength = Math.max(0, totalLength - dashBefore - afterLength);
  if (gapLength <= 0) {
    return null;
  }
  return { dashBefore, gapLength };
}
