import type { Chart } from '../../model/charts';
import { chartText } from '../chartPrimitives';
import type { RenderNode } from '../scene';
import type { ChartLayout } from './layout';

function categoryLabels(chart: Chart, count: number): string[] {
  if (chart.config?.categories?.length) {
    return chart.config.categories;
  }
  return Array.from({ length: count }, (_value, index) => String(index + 1));
}

export function buildCategoricalXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  const count = Math.max(1, ...chart.series.map(series => series.values.length));
  const slotWidth = layout.plot.width / count;
  const labels = categoryLabels(chart, count);

  return Array.from({ length: count }, (_value, index) => {
    const centerX = layout.plot.x + (index + 0.5) * slotWidth;
    return chartText({
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
