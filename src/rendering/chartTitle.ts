import type { Chart } from '../model/charts';
import { chartText } from './chartPrimitives';
import type { ChartRenderOrder } from './chartRenderOrder';
import { finite } from './renderPrimitives';
import type { Bounds, RenderNode } from './scene';

export function buildChartTitle(
  chart: Chart,
  bounds: Bounds,
  plot: { x: number; width: number },
  renderOrder: ChartRenderOrder,
): RenderNode[] {
  if (!chart.title) {
    return [];
  }

  return [
    {
      ...chartText(
        `chart-title-${chart.id}`,
        renderOrder.next(),
        bounds,
        plot.x,
        chart.y + 12,
        plot.width,
        20,
        chart.title,
        chart,
      ),
      fontWeight: 'bold',
      fontSize: Math.max(10, finite(chart.font_size, 12)) + 2,
    },
  ];
}
