import type { Chart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { chartText, chartTicks, mapChartValue } from '../primitives';
import type { ChartLayout } from './layout';

export function buildNumericXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axis_x).map((tick, index) => {
    const x = layout.plot.x + mapChartValue(tick, chart.axis_x, layout.plot.width);
    return chartText({
      id: `chart-x-tick-${chart.id}-${tick}`,
      order: order + index,
      bounds: layout.bounds,
      frame: { x: x - 20, y: layout.plot.y + layout.plot.height + 10, width: 40, height: 18 },
      text: String(tick),
      chart,
      align: 'center',
    });
  });
}
