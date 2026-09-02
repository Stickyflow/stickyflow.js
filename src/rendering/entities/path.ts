import type { FreeformPath } from '../../model/paths';
import type { RenderNode } from '../scene';
import { finite, freeformPathData, orderOf } from '../scene';

export function buildFreeformPath(path: FreeformPath, index: number): RenderNode[] {
  if (path.is_visible === false || path.points.length < 2) {
    return [];
  }
  const strokeWidth = finite(path.stroke_width, 2);
  const extra = strokeWidth + 12;
  const bounds = {
    minX: Math.min(...path.points.map(point => point.x)) - extra,
    minY: Math.min(...path.points.map(point => point.y)) - extra,
    maxX: Math.max(...path.points.map(point => point.x)) + extra,
    maxY: Math.max(...path.points.map(point => point.y)) + extra,
  };
  return [
    {
      type: 'path',
      id: `path-${path.id}`,
      order: orderOf(path, 30_000 + index),
      bounds,
      d: freeformPathData({ points: path.points, tension: finite(path.tension, 0), closed: path.closed === true }),
      markerStart: path.start_marker,
      markerEnd: path.end_marker,
      style: {
        fill: path.closed ? { kind: 'solid', color: path.fill_color ?? 'transparent' } : { kind: 'none' },
        stroke: { kind: 'solid', color: path.stroke_color ?? '#7c3aed' },
        strokeWidth,
        dash: path.dash?.length ? path.dash : undefined,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: finite(path.opacity, 1),
      },
    },
  ];
}
