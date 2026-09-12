import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { CHART_COLORS, chartText } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { MatrixGeometry } from './types';

interface MatrixPoint {
  x: number;
  y: number;
  radius: number;
}

export function renderMatrixPoints(context: ChartRenderContext, geometry: MatrixGeometry): RenderNode[] {
  const nodes: RenderNode[] = [];
  context.chart.series.forEach((series, seriesIndex) => {
    nodes.push(...renderSeriesPoint(context, geometry, series, seriesIndex));
  });
  return nodes;
}

function renderSeriesPoint(
  context: ChartRenderContext,
  geometry: MatrixGeometry,
  series: ChartSeries,
  seriesIndex: number,
): RenderNode[] {
  const value = pointValue(context, series);
  const point = {
    x: geometry.xPixel(value.x),
    y: geometry.yPixel(value.y),
    radius: Math.max(1, series.size ?? 5),
  };
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const nodes = [createPointNode(context, series, point, color)];
  if (context.showLabels && series.label) {
    nodes.push(createPointLabel(context, series, point));
  }
  return nodes;
}

function pointValue(context: ChartRenderContext, series: ChartSeries): { x: number; y: number } {
  if (series.values.length > 0 && Array.isArray(series.values[0])) {
    const [x, y] = (series.values as [number, number][])[0];
    return { x, y };
  }
  return {
    x: context.chart.axis_x.min,
    y: (series.values as number[])[0] ?? context.chart.axis_y.min,
  };
}

function createPointNode(
  context: ChartRenderContext,
  series: ChartSeries,
  point: MatrixPoint,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'ellipse',
    id: `chart-matrix-point-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    cx: point.x,
    cy: point.y,
    rx: point.radius,
    ry: point.radius,
    detail: { of: 'chartValue', series: series.id, valueIndex: 0 },
    style: {
      fill: paint(color, diagnostics, chart.id),
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: finite(chart.grid_width, 1),
    },
  };
}

function createPointLabel(context: ChartRenderContext, series: ChartSeries, point: MatrixPoint): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return chartText({
    id: `chart-matrix-label-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    frame: { x: point.x + point.radius + 4, y: point.y - 7, width: 120, height: 14 },
    text: series.label,
    chart,
  });
}
