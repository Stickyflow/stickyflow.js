import type { Rect } from '../../../model/geometry/types';

function centerDistance(from: Rect, to: Rect): number {
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;
  return Math.hypot(toCenterX - fromCenterX, toCenterY - fromCenterY);
}

export function nearestCandidates(bounds: Rect, candidates: Rect[], limit = 50): Rect[] {
  return [...candidates]
    .sort((first, second) => centerDistance(bounds, first) - centerDistance(bounds, second))
    .slice(0, limit);
}
