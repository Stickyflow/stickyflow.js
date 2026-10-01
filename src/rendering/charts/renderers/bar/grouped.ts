import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import {
  barShapePath,
  CHART_COLORS,
  createVerticalErrorWhiskerNode,
  errorBarRange,
  mapChartValue,
  resolveChartShadow,
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
    const height = Math.max(0, mapChartValue(numericValue, chart.axisY, plot.height));
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
  const nodes = createGroupedBarNodes(context, mark);
  const errorNode = createGroupedBarError(context, mark);
  if (errorNode) {
    nodes.push(errorNode);
  }
  return nodes;
}

function plotClipPath(plot: { x: number; y: number; width: number; height: number }): string {
  const { x, y, width, height } = plot;
  return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
}

function createGroupedBarNodes(context: ChartRenderContext, mark: GroupedBarMark): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const radius = chart.config?.barCornerRadius ?? 2;
  const { x, y, width, height } = mark.frame;
  const barPath = barShapePath(x, y, width, height, radius);
  const fill = paint(mark.color, diagnostics, chart.id);
  const stroke = paint(chart.config?.barBorderColor || '#000000', diagnostics, chart.id);
  const strokeWidth = finite(chart.config?.barBorderWidth, 0);
  const shadow = resolveChartShadow(chart.shadowStyle);

  const shadowCaster: RenderNode | undefined = shadow
    ? {
        type: 'path',
        id: `chart-bar-shadow-${chart.id}-${mark.seriesId}-${mark.valueIndex}`,
        order: nextOrder(),
        bounds,
        d: barPath,
        style: { fill, stroke, strokeWidth, shadow, clip: { type: 'path', d: plotClipPath(plot) } },
      }
    : undefined;

  const bar: RenderNode = {
    type: 'path',
    id: `chart-bar-${chart.id}-${mark.seriesId}-${mark.valueIndex}`,
    order: nextOrder(),
    bounds,
    d: barPath,
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
    style: { fill, stroke, strokeWidth, innerShadow: shadow },
  };

  return shadowCaster ? [shadowCaster, bar] : [bar];
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
      startY: plot.y + plot.height - mapChartValue(lower, chart.axisY, plot.height),
      endY: plot.y + plot.height - mapChartValue(upper, chart.axisY, plot.height),
    },
    color: chart.textColor ?? '#0f172a',
    valueReference: { seriesId: mark.seriesId, valueIndex: mark.valueIndex },
  });
}
