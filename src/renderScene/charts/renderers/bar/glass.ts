import type { RenderNode } from '../../../scene';
import { finite } from '../../../scene';
import { chartImageRect } from '../../chartBackdrop';
import type { ChartRenderContext } from '../types';

// Frosted glass: the chart's photo again, blurred and cut out in the bar's shape, drawn under the bar.
export function createGlassBackdropNodes(context: ChartRenderContext, id: string, d: string): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const blur = finite(chart.config?.barGlassBlur, 0);
  if (blur <= 0 || !chart.fillImage) {
    return [];
  }
  const rect = chartImageRect(chart);
  const nodes: RenderNode[] = [
    {
      type: 'image',
      id: `chart-bar-glass-${chart.id}-${id}`,
      order: nextOrder(),
      bounds,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      href: chart.fillImage.url,
      style: { blur, clip: { type: 'path', d }, pointerEvents: 'none' },
    },
  ];
  if (chart.fillImage.overlay) {
    nodes.push({
      type: 'path',
      id: `chart-bar-glass-overlay-${chart.id}-${id}`,
      order: nextOrder(),
      bounds,
      d,
      style: { fill: { kind: 'solid', color: chart.fillImage.overlay }, pointerEvents: 'none' },
    });
  }
  return nodes;
}
