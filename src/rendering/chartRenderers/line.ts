import type { ChartSeries } from '../../model/charts';
import { CHART_COLORS, errorBarRange, errorWhiskerNode, mapChartValue, representativeColor } from '../chartPrimitives';
import { paint } from '../renderPrimitives';
import type { RenderNode } from '../renderScene';
import { type CartesianPoint, pixelPoints, seriesValuePairs } from './cartesianPoints';
import type { ChartRenderContext } from './types';

export function renderLine(context: ChartRenderContext): RenderNode[] {
  const nodes: RenderNode[] = [];
  context.chart.series.forEach((series, seriesIndex) => {
    nodes.push(...renderLineSeries(context, series, seriesIndex));
  });
  return nodes;
}

function renderLineSeries(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): RenderNode[] {
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const pairs = seriesValuePairs(context.chart, series);
  const points = pixelPoints(context, pairs);
  const nodes: RenderNode[] = [];
  if (points.length) {
    nodes.push(createLinePath(context, series, points, color));
  }
  points.forEach((point, pointIndex) => {
    const errorNode = createLineError(context, series, pairs, point, pointIndex, color);
    if (errorNode) {
      nodes.push(errorNode);
    }
    nodes.push(createLinePoint(context, series, point, pointIndex, color));
  });
  return nodes;
}

function createLinePath(
  context: ChartRenderContext,
  series: ChartSeries,
  points: CartesianPoint[],
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const commands = points.map((point, index) => `${index ? 'L' : ''} ${point.x} ${point.y}`);
  return {
    type: 'path',
    id: `chart-line-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    d: `M ${commands.join(' ')}`,
    style: {
      fill: { kind: 'none' },
      stroke: paint(color, diagnostics, chart.id),
      strokeWidth: 2,
      lineJoin: 'round',
    },
  };
}

function createLineError(
  context: ChartRenderContext,
  series: ChartSeries,
  pairs: [number, number][],
  point: CartesianPoint,
  pointIndex: number,
  color: Parameters<typeof representativeColor>[0],
): RenderNode | null {
  const error = series.error?.[pointIndex];
  if (error == null) {
    return null;
  }
  const { chart, plot, bounds, nextOrder } = context;
  const [lower, upper] = errorBarRange(pairs[pointIndex][1], error);
  return errorWhiskerNode(
    `chart-line-error-${chart.id}-${series.id}-${pointIndex}`,
    nextOrder(),
    bounds,
    point.x,
    plot.y + plot.height - mapChartValue(lower, chart.axis_y, plot.height),
    plot.y + plot.height - mapChartValue(upper, chart.axis_y, plot.height),
    representativeColor(color, '#0f172a'),
    series.id,
    pointIndex,
  );
}

function createLinePoint(
  context: ChartRenderContext,
  series: ChartSeries,
  point: CartesianPoint,
  pointIndex: number,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'ellipse',
    id: `chart-point-${chart.id}-${series.id}-${pointIndex}`,
    order: nextOrder(),
    bounds,
    cx: point.x,
    cy: point.y,
    rx: 3,
    ry: 3,
    sfSeries: series.id,
    sfValueIndex: pointIndex,
    style: { fill: paint(color, diagnostics, chart.id) },
  };
}
