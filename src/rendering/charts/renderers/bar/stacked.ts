import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { barShapePath, CHART_COLORS, stackedSegment } from '../../primitives';
import { seriesValueColorProp, seriesValueProp } from '../../propPath';
import type { ChartRenderContext, StackedMode } from '../types';

export function renderStackedBars(context: ChartRenderContext, mode: StackedMode): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const valueCount = Math.max(1, ...chart.series.map(series => series.values.length));
  const slotWidth = plot.width / valueCount;
  const barWidth = Math.max(1, slotWidth - 8);
  const cornerRadius = chart.config?.barCornerRadius ?? 2;
  // Rounding every segment's corners would round the seam between two
  // stacked bars too, which reads as a gap that isn't there. `true`/percent
  // stack series bottom-to-top in series order, so only the last series ever
  // sits at the visible top of a column. Waterfall's bars don't stack on top
  // of each other at all (see stackedSegment) : each one is its own free-
  // standing column, so each gets the same rounding a grouped bar would.
  const outerSeriesIndex = mode === 'waterfall' ? null : chart.series.length - 1;

  for (let valueIndex = 0; valueIndex < valueCount; valueIndex++) {
    chart.series.forEach((series, seriesIndex) => {
      const color = series.colors?.[valueIndex] ?? series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const segment = stackedSegment(chart, mode, valueIndex, seriesIndex, plot.height);
      const radius = outerSeriesIndex === null || seriesIndex === outerSeriesIndex ? cornerRadius : 0;
      const x = plot.x + valueIndex * slotWidth + 4;
      const y = plot.y + plot.height - Math.max(segment.pixelStart, segment.pixelEnd);
      const height = Math.max(1, Math.abs(segment.pixelEnd - segment.pixelStart));
      nodes.push({
        type: 'path',
        id: `chart-bar-${chart.id}-${series.id}-${valueIndex}`,
        order: nextOrder(),
        bounds,
        d: barShapePath(x, y, barWidth, height, radius),
        detail: {
          of: 'chartValue',
          series: series.id,
          valueIndex,
          mark: 'bar',
          radius,
          colorProp: seriesValueColorProp(series.id, valueIndex),
          hasColorOverride: series.colors?.[valueIndex] != null,
        },
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
