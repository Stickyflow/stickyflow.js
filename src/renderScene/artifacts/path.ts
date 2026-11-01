import type { FreeformPath } from '../../model/path';
import type { RenderNode } from '../scene';
import { finite, freeformPathData } from '../scene';
import { radiusAt } from '../scene/freeformPath';
import { tag } from '../scene/tagging';

export function buildFreeformPath(path: FreeformPath, index: number): RenderNode[] {
  if (path.isVisible === false || path.points.length < 2) {
    return [];
  }
  const strokeWidth = finite(path.strokeWidth, 2);
  const extra = strokeWidth + 12;
  const bounds = {
    minX: Math.min(...path.points.map(point => point.x)) - extra,
    minY: Math.min(...path.points.map(point => point.y)) - extra,
    maxX: Math.max(...path.points.map(point => point.x)) + extra,
    maxY: Math.max(...path.points.map(point => point.y)) + extra,
  };
  const tension = finite(path.tension, 0);
  const closed = path.closed === true;
  const corners = { cornerRadius: finite(path.cornerRadius, 0), cornerRadii: path.cornerRadii };
  const radii = path.points.map((_, position) => radiusAt(corners, position));
  return [
    {
      type: 'path',
      id: `path-${path.id}`,
      order: 30_000 + index,
      bounds,
      d: freeformPathData({ points: path.points, tension, closed, ...corners }),
      markerStart: path.startMarker,
      markerEnd: path.endMarker,
      detail: {
        of: 'pathGeometry',
        points: path.points.map(point => [point.x, point.y]),
        tension,
        closed,
        ...(radii.some(radius => radius > 0) ? { cornerRadii: radii } : {}),
      },
      style: {
        fill: path.closed ? { kind: 'solid', color: path.fillColor ?? 'transparent' } : { kind: 'none' },
        stroke: { kind: 'solid', color: path.strokeColor ?? '#7c3aed' },
        strokeWidth,
        dash: path.dash?.length ? path.dash : undefined,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: finite(path.opacity, 1),
      },
    },
  ];
}

export function buildFreeformPaths(paths: readonly FreeformPath[]): RenderNode[] {
  return paths.flatMap((path, index) => tag(buildFreeformPath(path, index), 'path', path.id, 'path', 'Path'));
}
