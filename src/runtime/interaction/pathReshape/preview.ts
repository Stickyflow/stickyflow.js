import { freeformPathData } from '../../../renderScene/scene/freeformPath';
import { PATH_HALO_ATTR } from '../../dom';
import type { PathReshapeDragState } from './state';

export function applyPathReshapePreview(
  drag: PathReshapeDragState,
  point: { x: number; y: number },
): Array<[number, number]> {
  const points = drag.points.map((existing, index) =>
    index === drag.pointIndex ? [point.x, point.y] : existing,
  ) as Array<[number, number]>;
  const d = freeformPathData({
    points: points.map(([x, y]) => ({ x, y })),
    tension: drag.tension,
    closed: drag.closed,
  });
  drag.pathNode.setAttribute('d', d);
  drag.handle.setAttribute('cx', String(point.x));
  drag.handle.setAttribute('cy', String(point.y));
  drag.overlay?.querySelector(`[${PATH_HALO_ATTR}]`)?.setAttribute('d', d);
  return points;
}
