import type { Chart } from '../../model/chart';
import type { Bounds, RenderNode } from '../scene';
import { finite } from '../scene';
import type { ChartRenderOrder } from './chartRenderOrder';
import { chartText } from './primitives';
import { CHART_TITLE_PROP } from './propPath';

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
      fontSize: Math.max(10, finite(chart.fontSize, 12)) + 2,
      prop: CHART_TITLE_PROP,
    },
  ];
}
