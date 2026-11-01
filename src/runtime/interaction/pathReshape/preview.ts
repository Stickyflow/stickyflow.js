import { freeformPathData } from '../../../renderScene/scene/freeformPath';
import {
  PATH_CORNER_INDEX_ATTR,
  PATH_INSERT_INDEX_ATTR,
  PATH_POINT_INDEX_ATTR,
} from '../../../svg/domContract/attributes';
import { PATH_HALO_ATTR } from '../../dom';
import type { PathReshapeDragState } from './state';

export function applyPathReshapePreview(
  drag: PathReshapeDragState,
  point: { x: number; y: number },
): Array<[number, number]> {
  const [startX, startY] = drag.points[drag.pointIndex];
  const dx = point.x - startX;
  const dy = point.y - startY;
  const points = drag.points.map(([x, y], index) =>
    index === drag.pointIndex || drag.together.includes(index) ? [x + dx, y + dy] : [x, y],
  ) as Array<[number, number]>;
  for (const index of drag.together) {
    const handle = drag.overlay?.querySelector(`[${PATH_POINT_INDEX_ATTR}="${index}"]`);
    handle?.setAttribute('cx', String(points[index][0]));
    handle?.setAttribute('cy', String(points[index][1]));
  }
  const d = freeformPathData({
    points: points.map(([x, y]) => ({ x, y })),
    tension: drag.tension,
    closed: drag.closed,
    cornerRadii: drag.cornerRadii,
  });
  drag.pathNode.setAttribute('d', d);
  drag.handle.setAttribute('cx', String(point.x));
  drag.handle.setAttribute('cy', String(point.y));
  drag.overlay?.querySelector(`[${PATH_HALO_ATTR}]`)?.setAttribute('d', d);
  for (const other of drag.overlay?.querySelectorAll(`[${PATH_CORNER_INDEX_ATTR}], [${PATH_INSERT_INDEX_ATTR}]`) ??
    []) {
    if (other !== drag.handle) {
      other.setAttribute('display', 'none');
    }
  }
  return points;
}
