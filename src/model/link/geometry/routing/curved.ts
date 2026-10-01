import { routeCubic, type Side } from '../../../geometry/router';
import type { ConnectionPoint, PathPointsResult } from './types';

export function curvedPath(from: ConnectionPoint, to: ConnectionPoint, fromSide: Side, toSide: Side): PathPointsResult {
  const { p0, p1, p2, p3 } = routeCubic(from, to, fromSide, toSide, { min: 35, max: 90, sMult: 0.5 });
  return { points: [...p0, ...p1, ...p2, ...p3], segments: [] };
}
