import type { Chart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { chartText } from '../primitives';
import { seriesLabelProp } from '../propPath';
import type { ChartLayout } from './layout';

export function buildBoxplotSeriesYAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  const count = Math.max(1, chart.series.length);
  const slotWidth = layout.plot.height / count;

  return chart.series.map((series, index) => {
    const centerY = layout.plot.y + (index + 0.5) * slotWidth;
    return {
      ...chartText({
        role: 'axis',
        id: `chart-y-tick-${chart.id}-${index}`,
        order: order + index,
        bounds: layout.bounds,
        frame: { x: chart.x, y: centerY - 9, width: layout.padLeft - 8, height: 18 },
        text: series.label || series.id,
        chart,
        align: 'right',
      }),
      prop: seriesLabelProp(series.id),
    };
  });
}
