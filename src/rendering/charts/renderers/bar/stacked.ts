import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { CHART_COLORS, stackedSegment } from '../../primitives';
import { seriesValueProp } from '../../propPath';
import type { ChartRenderContext, StackedMode } from '../types';

export function renderStackedBars(context: ChartRenderContext, mode: StackedMode): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const valueCount = Math.max(1, ...chart.series.map(series => series.values.length));
  const slotWidth = plot.width / valueCount;
  const barWidth = Math.max(1, slotWidth - 8);

  for (let valueIndex = 0; valueIndex < valueCount; valueIndex++) {
    chart.series.forEach((series, seriesIndex) => {
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const segment = stackedSegment(chart, mode, valueIndex, seriesIndex, plot.height);
      nodes.push({
        type: 'rect',
        id: `chart-bar-${chart.id}-${series.id}-${valueIndex}`,
        order: nextOrder(),
        bounds,
        x: plot.x + valueIndex * slotWidth + 4,
        y: plot.y + plot.height - Math.max(segment.pixelStart, segment.pixelEnd),
        width: barWidth,
        height: Math.max(1, Math.abs(segment.pixelEnd - segment.pixelStart)),
        rx: chart.config?.barCornerRadius ?? 2,
        detail: { of: 'chartValue', series: series.id, valueIndex },
        prop: seriesValueProp(series.id, valueIndex),
        style: {
          fill: paint(color, diagnostics, chart.id),
          stroke: paint(chart.config?.barBorderColor || '#000000', diagnostics, chart.id),
          strokeWidth: finite(chart.config?.barBorderWidth, 0),
        },
      });
    });
  }
  return nodes;
}
