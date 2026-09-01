import type { Chart } from '../../model/charts';
import { chartText, chartTicks, mapChartValue } from '../chartPrimitives';
import type { RenderNode } from '../scene';
import type { ChartLayout } from './layout';

export function buildNumericYAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axis_y).map((tick, index) => {
    const y = layout.plot.y + layout.plot.height - mapChartValue(tick, chart.axis_y, layout.plot.height);
    return chartText(
      `chart-y-tick-${chart.id}-${tick}`,
      order + index,
      layout.bounds,
      chart.x,
      y - 6,
      layout.padLeft - 8,
      18,
      String(tick),
      chart,
      'right',
    );
  });
}
