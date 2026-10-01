import type { Link, PathType } from '../types';
import { curvedPath } from './routing/curved';
import { orthogonalPath } from './routing/orthogonal';
import { roundedOrthogonalPathData } from './routing/pathData';
import { connectionSides } from './routing/sides';
import { straightPath } from './routing/straight';
import type { ConnectionPoint, PathPointsResult } from './routing/types';

export type { PathPointsResult } from './routing/types';
export { roundedOrthogonalPathData };

export function getPathPoints(
  link: Link,
  effectiveFrom: ConnectionPoint,
  effectiveTo: ConnectionPoint,
  pathType: PathType,
): PathPointsResult {
  const { fromSide, toSide } = connectionSides(link, effectiveFrom, effectiveTo);
  if (pathType === 'curved') {
    return curvedPath(effectiveFrom, effectiveTo, fromSide, toSide);
  }
  if (pathType === 'orthogonal') {
    return orthogonalPath(link, effectiveFrom, effectiveTo, fromSide, toSide);
  }
  return straightPath(effectiveFrom, effectiveTo);
}
