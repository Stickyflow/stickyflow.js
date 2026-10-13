import type { Chart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { chartText, chartTicks, mapChartValue } from '../primitives';
import { type ChartLayout, tickOffset } from './layout';

export function buildNumericXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axisX).map((tick, index) => {
    const x = layout.plot.x + mapChartValue(tick, chart.axisX, layout.plot.width);
    return chartText({
      role: 'axis',
      id: `chart-x-tick-${chart.id}-${tick}`,
      order: order + index,
      bounds: layout.bounds,
      frame: { x: x - 20, y: layout.plot.y + layout.plot.height + 10 + tickOffset(chart), width: 40, height: 18 },
      text: String(tick),
      chart,
      align: 'center',
    });
  });
}
