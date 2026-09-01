import type { Chart } from '../../model/charts';
import { chartText, chartTicks, mapChartValue } from '../chartPrimitives';
import type { RenderNode } from '../scene';
import type { ChartLayout } from './layout';

export function buildNumericXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axis_x).map((tick, index) => {
    const x = layout.plot.x + mapChartValue(tick, chart.axis_x, layout.plot.width);
    return chartText(
      `chart-x-tick-${chart.id}-${tick}`,
      order + index,
      layout.bounds,
      x - 20,
      layout.plot.y + layout.plot.height + 4,
      40,
      18,
      String(tick),
      chart,
      'center',
    );
  });
}
