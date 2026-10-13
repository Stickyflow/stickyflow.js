import type { Chart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { chartText, chartTicks, mapChartValue } from '../primitives';
import { type ChartLayout, tickOffset } from './layout';

export function buildNumericYAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axisY).map((tick, index) => {
    const y = layout.plot.y + layout.plot.height - mapChartValue(tick, chart.axisY, layout.plot.height);
    return chartText({
      role: 'axis',
      id: `chart-y-tick-${chart.id}-${tick}`,
      order: order + index,
      bounds: layout.bounds,
      frame: { x: chart.x, y: y - 6, width: layout.padLeft - 14 - tickOffset(chart), height: 18 },
      text: String(tick),
      chart,
      align: 'right',
    });
  });
}
