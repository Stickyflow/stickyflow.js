import type { TypedChart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { chartText } from '../primitives';
import { seriesLabelProp } from '../propPath';
import type { ChartLayout } from './layout';

function categoryLabels(chart: TypedChart, count: number): string[] {
  if (chart.config?.categories?.length) {
    return chart.config.categories;
  }
  return Array.from({ length: count }, (_value, index) => String(index + 1));
}

export function buildCategoricalXAxisTicks(chart: TypedChart, layout: ChartLayout, order: number): RenderNode[] {
  const count = Math.max(1, ...chart.series.map(series => series.values.length));
  const slotWidth = layout.plot.width / count;
  const labels = categoryLabels(chart, count);

  return Array.from({ length: count }, (_value, index) => {
    const centerX = layout.plot.x + (index + 0.5) * slotWidth;
    return chartText({
      role: 'axis',
      id: `chart-x-tick-${chart.id}-${index}`,
      order: order + index,
      bounds: layout.bounds,
      frame: {
        x: centerX - slotWidth / 2,
        y: layout.plot.y + layout.plot.height + 4,
        width: slotWidth,
        height: 18,
      },
      text: labels[index] ?? String(index + 1),
      chart,
      align: 'center',
    });
  });
}

export function buildSeriesXAxisTicks(chart: TypedChart, layout: ChartLayout, order: number): RenderNode[] {
  const count = Math.max(1, chart.series.length);
  const slotWidth = layout.plot.width / count;

  return chart.series.map((series, index) => {
    const centerX = layout.plot.x + (index + 0.5) * slotWidth;
    return {
      ...chartText({
      role: 'axis',
        id: `chart-x-tick-${chart.id}-${index}`,
        order: order + index,
        bounds: layout.bounds,
        frame: {
          x: centerX - slotWidth / 2,
          y: layout.plot.y + layout.plot.height + 4,
          width: slotWidth,
          height: 18,
        },
        text: series.label || series.id,
        chart,
        align: 'center',
      }),
      prop: seriesLabelProp(series.id),
    };
  });
}
