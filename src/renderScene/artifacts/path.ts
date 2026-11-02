import type { FreeformPath } from '../../model/path';
import type { RenderNode } from '../scene';
import { finite, freeformPathData } from '../scene';
import { radiusAt } from '../scene/freeformPath';
import { tag } from '../scene/tagging';

// Each layer of the light: its place, its blur and its width as parts of the glow, and its strength.
const GLOW_LAYERS = [
  [0, 1, 0.5, 0.55],
  [1, 0.3, 0.15, 0.8],
] as const;

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
  const nodes: RenderNode[] = [
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
        transition: path.transition,
      },
    },
  ];
  const glow = finite(path.glow, 0);
  if (glow > 0) {
    const d = freeformPathData({ points: path.points, tension, closed, ...corners });
    const color = path.glowColor ?? path.strokeColor ?? '#7c3aed';
    const reach = glow * 4 + strokeWidth;
    const blurArea = {
      x: bounds.minX + extra - reach,
      y: bounds.minY + extra - reach,
      width: bounds.maxX - bounds.minX - extra * 2 + reach * 2,
      height: bounds.maxY - bounds.minY - extra * 2 + reach * 2,
    };
    // A wide soft light, and a tight bright one under the line itself.
    for (const [part, blur, width, strength] of GLOW_LAYERS) {
      nodes.push({
        type: 'path',
        id: `path-${path.id}-glow-${part}`,
        order: 30_000 + index - 0.3 + part * 0.1,
        bounds,
        d,
        style: {
          fill: { kind: 'none' },
          stroke: { kind: 'solid', color },
          strokeWidth: strokeWidth + glow * width,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: finite(path.opacity, 1) * strength,
          blur: glow * blur,
          blurArea,
          pointerEvents: 'none',
          transition: path.transition,
        },
      });
    }
  }
  return nodes;
}

export function buildFreeformPaths(paths: readonly FreeformPath[]): RenderNode[] {
  return paths.flatMap((path, index) => tag(buildFreeformPath(path, index), 'path', path.id, 'path', 'Path'));
}
