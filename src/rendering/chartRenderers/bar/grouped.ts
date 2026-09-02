import type { ChartSeries } from '../../../model/charts';
import { CHART_COLORS, createVerticalErrorWhiskerNode, errorBarRange, mapChartValue } from '../../chartPrimitives';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';

export function renderGroupedBars(context: ChartRenderContext): RenderNode[] {
  const { chart, plot } = context;
  const nodes: RenderNode[] = [];
  const valueCount = Math.max(1, ...chart.series.map(series => series.values.length));
  const slotWidth = plot.width / valueCount;
  const seriesWidth = Math.max(1, (slotWidth - 8) / Math.max(1, chart.series.length));

  chart.series.forEach((series, seriesIndex) => {
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    series.values.forEach((value, valueIndex) => {
      const numericValue = Array.isArray(value) ? value[1] : value;
      const x = plot.x + valueIndex * slotWidth + 4 + seriesIndex * seriesWidth;
      const width = Math.max(1, seriesWidth - 2);
      nodes.push(createGroupedBar(context, series, valueIndex, numericValue, x, width, color));
      const errorNode = createBarError(context, series, valueIndex, numericValue, x, width);
      if (errorNode) {
        nodes.push(errorNode);
      }
    });
  });
  return nodes;
}

function createGroupedBar(
  context: ChartRenderContext,
  series: ChartSeries,
  valueIndex: number,
  value: number,
  x: number,
  width: number,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const height = Math.max(0, mapChartValue(value, chart.axis_y, plot.height));
  return {
    type: 'rect',
    id: `chart-bar-${chart.id}-${series.id}-${valueIndex}`,
    order: nextOrder(),
    bounds,
    x,
    y: plot.y + plot.height - height,
    width,
    height,
    rx: 2,
    detail: { of: 'chartValue', series: series.id, valueIndex },
    style: { fill: paint(color, diagnostics, chart.id) },
  };
}

function createBarError(
  context: ChartRenderContext,
  series: ChartSeries,
  valueIndex: number,
  value: number,
  x: number,
  width: number,
): RenderNode | null {
  const error = series.error?.[valueIndex];
  if (error == null) {
    return null;
  }
  const { chart, plot, bounds, nextOrder } = context;
  const [lower, upper] = errorBarRange(value, error);
  return createVerticalErrorWhiskerNode({
    id: `chart-bar-error-${chart.id}-${series.id}-${valueIndex}`,
    order: nextOrder(),
    bounds,
    geometry: {
      centerX: x + width / 2,
      startY: plot.y + plot.height - mapChartValue(lower, chart.axis_y, plot.height),
      endY: plot.y + plot.height - mapChartValue(upper, chart.axis_y, plot.height),
    },
    color: chart.text_color ?? '#0f172a',
    valueReference: { seriesId: series.id, valueIndex },
  });
}
