import type { Chart } from '../../../model/charts';
import type { RenderNode } from '../../scene';
import { chartText, chartTicks, mapChartValue } from '../primitives';
import type { ChartLayout } from './layout';

export function buildNumericYAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axis_y).map((tick, index) => {
    const y = layout.plot.y + layout.plot.height - mapChartValue(tick, chart.axis_y, layout.plot.height);
    return chartText({
      id: `chart-y-tick-${chart.id}-${tick}`,
      order: order + index,
      bounds: layout.bounds,
      frame: { x: chart.x, y: y - 6, width: layout.padLeft - 8, height: 18 },
      text: String(tick),
      chart,
      align: 'right',
    });
  });
}
