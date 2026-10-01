import type { ChartSeries, TypedChart } from '../../../model/chart';
import type { RenderNode, SceneStyle } from '../../scene';
import { finite, freeformPathData, paint } from '../../scene';
import { CHART_COLORS, chartText, DEFAULT_ZONE_FILL, mapChartValue } from '../primitives';
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

const HOLLOW_POINT_STROKE = '#94a3b8';
const CONNECTOR_LABEL_GAP = 8;
const CONNECTOR_LABEL_WIDTH = 140;

export function renderCustom(context: ChartRenderContext): RenderNode[] {
  if (context.chart.config?.connectPoints && context.chart.series.length >= 2) {
    return renderConnectedPairs(context);
  }
  return context.chart.series.flatMap((series, seriesIndex) => renderCustomSeries(context, series, seriesIndex));
}

function renderCustomSeries(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): RenderNode[] {
  const style = customSeriesStyle(context, series, seriesIndex);
  return customSeriesValues(context, series).map((value, valueIndex) => {
    const point = customPointPosition(context, value);
    const mark = { series, valueIndex, point, style };
    return series.symbol?.points.length ? createCustomSymbolMark(context, mark) : createCustomPointMark(context, mark);
  });
}

function isHorizontal(chart: TypedChart): boolean {
  return chart.config?.orientation === 'horizontal';
}

function customSeriesValues(context: ChartRenderContext, series: ChartSeries): Array<[number, number]> {
  const { chart } = context;
  const hasExplicitXValues = series.values.length > 0 && Array.isArray(series.values[0]);
  if (hasExplicitXValues) {
    return (series.values as number[][]).map(value => [value[0], value[1]]);
  }
  if (isHorizontal(chart)) {
    return (series.values as number[]).map((value, index) => [value, chart.axisY.min + index * chart.axisY.step]);
  }
  return (series.values as number[]).map((value, index) => [chart.axisX.min + index * chart.axisX.step, value]);
}

function metricComponent(chart: TypedChart, point: [number, number]): number {
  return isHorizontal(chart) ? point[0] : point[1];
}

function customPointPosition(context: ChartRenderContext, value: [number, number]): CustomChartPoint {
  return {
    x: context.plot.x + mapChartValue(value[0], context.chart.axisX, context.plot.width),
    y: context.plot.y + context.plot.height - mapChartValue(value[1], context.chart.axisY, context.plot.height),
  };
}

function customSeriesStyle(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): SceneStyle {
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  return {
    fill: paint(color, context.diagnostics, context.chart.id),
    stroke: series.stroke ? { kind: 'solid', color: series.stroke } : undefined,
    strokeWidth: series.stroke ? finite(series.strokeWidth, 1) : undefined,
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

function customMarkId(chart: TypedChart, series: ChartSeries, valueIndex: number): string {
  return `chart-custom-mark-${chart.id}-${series.id}-${valueIndex}`;
}

function renderConnectedPairs(context: ChartRenderContext): RenderNode[] {
  const { chart } = context;
  const [beforeSeries, afterSeries] = chart.series;
  const beforeValues = customSeriesValues(context, beforeSeries);
  const afterValues = customSeriesValues(context, afterSeries);
  const zones = chart.config?.zones ?? [];
  const betterColor = zones[0]?.color ?? '#10b981';
  const worseColor = zones[1]?.color ?? '#ec4899';
  const tieColor = zones[2]?.color ?? DEFAULT_ZONE_FILL;
  const reverse = Boolean(chart.config?.reverseComparison);
  const count = Math.min(beforeValues.length, afterValues.length);
  const categories = chart.config?.categories ?? [];
  const nodes: RenderNode[] = [];

  for (let index = 0; index < count; index++) {
    const beforeValue = beforeValues[index];
    const afterValue = afterValues[index];
    const beforePoint = customPointPosition(context, beforeValue);
    const afterPoint = customPointPosition(context, afterValue);
    const beforeMetric = metricComponent(chart, beforeValue);
    const afterMetric = metricComponent(chart, afterValue);
    const better = reverse ? afterMetric < beforeMetric : afterMetric > beforeMetric;
    const worse = reverse ? afterMetric > beforeMetric : afterMetric < beforeMetric;
    const comparisonColor = better ? betterColor : worse ? worseColor : tieColor;
    const radius = finite(afterSeries.size, 3);

    nodes.push(createConnectorLine(context, index, beforePoint, afterPoint, comparisonColor));
    nodes.push(
      createCustomPointMark(context, {
        series: beforeSeries,
        valueIndex: index,
        point: beforePoint,
        style: {
          fill: paint(chart.gridColor ?? '#e2e8f0', context.diagnostics, chart.id),
          stroke: { kind: 'solid', color: HOLLOW_POINT_STROKE },
          strokeWidth: 1.5,
        },
      }),
    );
    nodes.push(
      createCustomPointMark(context, {
        series: afterSeries,
        valueIndex: index,
        point: afterPoint,
        style: {
          fill: paint(comparisonColor, context.diagnostics, chart.id),
          stroke: undefined,
          strokeWidth: undefined,
        },
      }),
    );
    if (context.showLabels && categories[index]) {
      nodes.push(createConnectorLabel(context, index, beforePoint, afterPoint, radius, categories[index]));
    }
  }

  return nodes;
}

function createConnectorLine(
  context: ChartRenderContext,
  index: number,
  from: CustomChartPoint,
  to: CustomChartPoint,
  color: string,
): RenderNode {
  const { chart } = context;
  return {
    type: 'path',
    id: `chart-custom-connector-${chart.id}-${index}`,
    order: context.nextOrder(),
    bounds: context.bounds,
    d: `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
    style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: 2 },
  };
}

function createConnectorLabel(
  context: ChartRenderContext,
  index: number,
  beforePoint: CustomChartPoint,
  afterPoint: CustomChartPoint,
  radius: number,
  text: string,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const horizontal = isHorizontal(chart);
  const frame = horizontal
    ? {
        x: Math.max(beforePoint.x, afterPoint.x) + radius + CONNECTOR_LABEL_GAP,
        y: Math.min(beforePoint.y, afterPoint.y) - 8,
        width: CONNECTOR_LABEL_WIDTH,
        height: 16,
      }
    : {
        x: Math.min(beforePoint.x, afterPoint.x) - CONNECTOR_LABEL_WIDTH / 2,
        y: Math.min(beforePoint.y, afterPoint.y) - radius - CONNECTOR_LABEL_GAP - 14,
        width: CONNECTOR_LABEL_WIDTH,
        height: 16,
      };
  return {
    ...chartText({
      id: `chart-custom-label-${chart.id}-${index}`,
      order: nextOrder(),
      bounds,
      frame,
      text,
      chart,
      align: horizontal ? 'left' : 'center',
    }),
    fontSize: Math.max(9, finite(chart.fontSize, 12)) - 2,
  };
}
