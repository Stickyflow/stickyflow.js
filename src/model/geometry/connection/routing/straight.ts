import type { ConnectionPoint, PathPointsResult } from './types';

export function straightPath(from: ConnectionPoint, to: ConnectionPoint): PathPointsResult {
  return { points: [from.x, from.y, to.x, to.y], segments: [] };
}
