import type { Chart } from '../../../model/chart';
import type { Bounds, RenderNode, SceneStyle } from '../../scene';

export function createGridDot(
  chart: Chart,
  id: string,
  order: number,
  bounds: Bounds,
  x: number,
  y: number,
  width: number,
  clip: SceneStyle['clip'],
): RenderNode {
  const radius = Math.max(1, width * 1.5);
  const style = { fill: { kind: 'solid' as const, color: chart.grid_color ?? '#e2e8f0' }, clip };
  if (chart.grid_rounded_corners === true) {
    return { type: 'ellipse', id, order, bounds, cx: x, cy: y, rx: radius, ry: radius, style };
  }
  const size = radius * 2;
  return { type: 'rect', id, order, bounds, x: x - radius, y: y - radius, width: size, height: size, style };
}
