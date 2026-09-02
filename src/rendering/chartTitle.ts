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
      ...chartText({
        id: `chart-title-${chart.id}`,
        order: renderOrder.next(),
        bounds,
        frame: { x: plot.x, y: chart.y + 12, width: plot.width, height: 20 },
        text: chart.title,
        chart,
      }),
      fontWeight: 'bold',
      fontSize: Math.max(10, finite(chart.font_size, 12)) + 2,
    },
  ];
}
