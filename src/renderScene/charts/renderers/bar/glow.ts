import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { representativeColor } from '../../primitives';
import type { ChartRenderContext } from '../types';

export function createBarGlowNode(
  context: ChartRenderContext,
  id: string,
  d: string,
  color: NonNullable<ChartSeries['color']>,
  glow: number,
  bounds: RenderNode['bounds'] = context.bounds,
): RenderNode {
  const { chart, diagnostics, nextOrder } = context;
  return {
    type: 'path',
    id,
    order: nextOrder(),
    bounds,
    d,
    style: {
      fill: paint(color, diagnostics, chart.id),
      shadow: { color: representativeColor(color, '#ffffff'), opacity: 0.9, blur: glow, dx: 0, dy: 0 },
      pointerEvents: 'none',
    },
  };
}
