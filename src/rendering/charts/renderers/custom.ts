import type { Chart, ChartSeries } from '../../../model/charts';
import type { RenderNode, SceneStyle } from '../../scene';
import { finite, freeformPathData, paint } from '../../scene';
import { CHART_COLORS, mapChartValue } from '../primitives';
import type { ChartRenderContext } from './types';

interface CustomChartPoint {
  x: number;
  y: number;
}

interface CustomMark {
  series: ChartSeries;
  valueIndex: number;
  point: CustomChartPoint;
  style: SceneStyle;
}

export function renderCustom(context: ChartRenderContext): RenderNode[] {
  return context.chart.series.flatMap((series, seriesIndex) => renderCustomSeries(context, series, seriesIndex));
}

function renderCustomSeries(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): RenderNode[] {
  const style = customSeriesStyle(context, series, seriesIndex);
  return customSeriesValues(context.chart, series).map((value, valueIndex) => {
    const point = customPointPosition(context, value);
    const mark = { series, valueIndex, point, style };
    return series.symbol?.points.length ? createCustomSymbolMark(context, mark) : createCustomPointMark(context, mark);
  });
}

function customSeriesValues(chart: Chart, series: ChartSeries): Array<[number, number]> {
  const hasExplicitXValues = series.values.length > 0 && Array.isArray(series.values[0]);
  if (hasExplicitXValues) {
    return (series.values as number[][]).map(value => [value[0], value[1]]);
  }
  return (series.values as number[]).map((value, index) => [chart.axis_x.min + index * chart.axis_x.step, value]);
}

function customPointPosition(context: ChartRenderContext, value: [number, number]): CustomChartPoint {
  return {
    x: context.plot.x + mapChartValue(value[0], context.chart.axis_x, context.plot.width),
    y: context.plot.y + context.plot.height - mapChartValue(value[1], context.chart.axis_y, context.plot.height),
  };
}

function customSeriesStyle(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): SceneStyle {
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  return {
    fill: paint(color, context.diagnostics, context.chart.id),
    stroke: series.stroke ? { kind: 'solid', color: series.stroke } : undefined,
    strokeWidth: series.stroke ? finite(series.stroke_width, 1) : undefined,
  };
}

function createCustomSymbolMark(context: ChartRenderContext, mark: CustomMark): RenderNode {
  const symbol = mark.series.symbol;
  const size = finite(mark.series.size, 3);
  const scale = symbol?.normalized ? size * 2 : 1;
  const offset = symbol?.normalized ? 0.5 : 0;
  const points = (symbol?.points ?? []).map(([x, y]) => ({
    x: mark.point.x + (x - offset) * scale,
    y: mark.point.y + (y - offset) * scale,
  }));
  return {
    type: 'path',
    id: customMarkId(context.chart, mark.series, mark.valueIndex),
    order: context.nextOrder(),
    bounds: context.bounds,
    d: freeformPathData({ points, tension: finite(symbol?.tension, 0), closed: true }),
    style: mark.style,
  };
}

function createCustomPointMark(context: ChartRenderContext, mark: CustomMark): RenderNode {
  const radius = finite(mark.series.size, 3);
  return {
    type: 'ellipse',
    id: customMarkId(context.chart, mark.series, mark.valueIndex),
    order: context.nextOrder(),
    bounds: context.bounds,
    cx: mark.point.x,
    cy: mark.point.y,
    rx: radius,
    ry: radius,
    style: mark.style,
  };
}

function customMarkId(chart: Chart, series: ChartSeries, valueIndex: number): string {
  return `chart-custom-mark-${chart.id}-${series.id}-${valueIndex}`;
}
