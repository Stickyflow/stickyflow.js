import type { PathType } from '../../types';
import type { ArrowDirection, MarkerPoint } from './types';

function shortenedArrowSegment(endpoint: MarkerPoint, neighbor: MarkerPoint): number[] {
  const dx = endpoint.x - neighbor.x;
  const dy = endpoint.y - neighbor.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length <= 0) {
    return [neighbor.x, neighbor.y, endpoint.x, endpoint.y];
  }
  return [endpoint.x - (dx / length) * 8, endpoint.y - (dy / length) * 8, endpoint.x, endpoint.y];
}

function curvedArrowPoints(points: number[], direction: ArrowDirection): number[] {
  if (direction === 'forward') {
    const last = points.length - 2;
    return shortenedArrowSegment(
      { x: points[last], y: points[last + 1] },
      { x: points[last - 2], y: points[last - 1] },
    );
  }
  return shortenedArrowSegment({ x: points[0], y: points[1] }, { x: points[2], y: points[3] });
}

function linearArrowPoints(points: number[], direction: ArrowDirection, from: MarkerPoint, to: MarkerPoint): number[] {
  if (direction === 'forward') {
    if (points.length >= 4) {
      return [
        points[points.length - 4],
        points[points.length - 3],
        points[points.length - 2],
        points[points.length - 1],
      ];
    }
    return [points[0] || from.x, points[1] || from.y, points[2] || to.x, points[3] || to.y];
  }
  return [points[2] || to.x, points[3] || to.y, points[0] || from.x, points[1] || from.y];
}

export function getArrowPoints(
  points: number[],
  pathType: PathType,
  direction: ArrowDirection,
  from: MarkerPoint,
  to: MarkerPoint,
): number[] {
  if (pathType === 'curved') {
    return curvedArrowPoints(points, direction);
  }
  return linearArrowPoints(points, direction, from, to);
}
