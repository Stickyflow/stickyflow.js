import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import {
  barShapePath,
  CHART_COLORS,
  createVerticalErrorWhiskerNode,
  errorBarRange,
  mapChartValue,
} from '../../primitives';
import { seriesValueColorProp, seriesValueProp } from '../../propPath';
import type { ChartRenderContext } from '../types';

interface GroupedBarLayout {
  slotWidth: number;
  seriesWidth: number;
}

interface GroupedBarMark {
  seriesId: string;
  valueIndex: number;
  value: number;
  error: number | [number, number] | null | undefined;
  color: NonNullable<ChartSeries['color']>;
  hasColorOverride: boolean;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function renderGroupedBars(context: ChartRenderContext): RenderNode[] {
  const layout = createGroupedBarLayout(context);
  return context.chart.series.flatMap((series, seriesIndex) =>
    renderGroupedBarSeries(context, layout, series, seriesIndex),
  );
}

function createGroupedBarLayout(context: ChartRenderContext): GroupedBarLayout {
  const { chart, plot } = context;
  const valueCount = Math.max(1, ...chart.series.map(series => series.values.length));
  const slotWidth = plot.width / valueCount;
  return {
    slotWidth,
    seriesWidth: Math.max(1, (slotWidth - 8) / Math.max(1, chart.series.length)),
  };
}

function createSeriesBarMarks(
  context: ChartRenderContext,
  layout: GroupedBarLayout,
  series: ChartSeries,
  seriesIndex: number,
): GroupedBarMark[] {
  const { chart, plot } = context;
  const seriesColor = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  return series.values.map((value, valueIndex) => {
    const numericValue = Array.isArray(value) ? value[1] : value;
    const height = Math.max(0, mapChartValue(numericValue, chart.axis_y, plot.height));
    return {
      seriesId: series.id,
      valueIndex,
      value: numericValue,
      error: series.error?.[valueIndex],
      color: series.colors?.[valueIndex] ?? seriesColor,
      hasColorOverride: series.colors?.[valueIndex] != null,
      frame: {
        x: plot.x + valueIndex * layout.slotWidth + 4 + seriesIndex * layout.seriesWidth,
        y: plot.y + plot.height - height,
        width: Math.max(1, layout.seriesWidth - 2),
        height,
      },
    };
  });
}

function renderGroupedBarSeries(
  context: ChartRenderContext,
  layout: GroupedBarLayout,
  series: ChartSeries,
  seriesIndex: number,
): RenderNode[] {
  return createSeriesBarMarks(context, layout, series, seriesIndex).flatMap(mark =>
    renderGroupedBarMark(context, mark),
  );
}

function renderGroupedBarMark(context: ChartRenderContext, mark: GroupedBarMark): RenderNode[] {
  const nodes = [createGroupedBarNode(context, mark)];
  const errorNode = createGroupedBarError(context, mark);
  if (errorNode) {
    nodes.push(errorNode);
  }
  return nodes;
}

function createGroupedBarNode(context: ChartRenderContext, mark: GroupedBarMark): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const radius = chart.config?.barCornerRadius ?? 2;
  const { x, y, width, height } = mark.frame;
  return {
    type: 'path',
    id: `chart-bar-${chart.id}-${mark.seriesId}-${mark.valueIndex}`,
    order: nextOrder(),
    bounds,
    d: barShapePath(x, y, width, height, radius),
    detail: {
      of: 'chartValue',
      series: mark.seriesId,
      valueIndex: mark.valueIndex,
      mark: 'bar',
      radius,
      colorProp: seriesValueColorProp(mark.seriesId, mark.valueIndex),
      hasColorOverride: mark.hasColorOverride,
    },
    prop: seriesValueProp(mark.seriesId, mark.valueIndex),
    style: {
      fill: paint(mark.color, diagnostics, chart.id),
      stroke: paint(chart.config?.barBorderColor || '#000000', diagnostics, chart.id),
      strokeWidth: finite(chart.config?.barBorderWidth, 0),
    },
  };
}

function createGroupedBarError(context: ChartRenderContext, mark: GroupedBarMark): RenderNode | null {
  if (mark.error == null) {
    return null;
  }
  const { chart, plot, bounds, nextOrder } = context;
  const [lower, upper] = errorBarRange(mark.value, mark.error);
  return createVerticalErrorWhiskerNode({
    id: `chart-bar-error-${chart.id}-${mark.seriesId}-${mark.valueIndex}`,
    order: nextOrder(),
    bounds,
    geometry: {
      centerX: mark.frame.x + mark.frame.width / 2,
      startY: plot.y + plot.height - mapChartValue(lower, chart.axis_y, plot.height),
      endY: plot.y + plot.height - mapChartValue(upper, chart.axis_y, plot.height),
    },
    color: chart.text_color ?? '#0f172a',
    valueReference: { seriesId: mark.seriesId, valueIndex: mark.valueIndex },
  });
}
