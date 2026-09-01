import type { ChartSeries } from '../../../model/charts';
import { CHART_COLORS } from '../../chartPrimitives';
import { freeformPathData, paint } from '../../renderPrimitives';
import type { RenderNode } from '../../renderScene';
import type { ChartRenderContext } from '../types';
import type { RadarGeometry, RadarPoint } from './types';

export function renderRadarSeries(context: ChartRenderContext, geometry: RadarGeometry): RenderNode[] {
  const nodes: RenderNode[] = [];
  context.chart.series.forEach((series, seriesIndex) => {
    nodes.push(...renderSeries(context, geometry, series, seriesIndex));
  });
  return nodes;
}

function renderSeries(
  context: ChartRenderContext,
  geometry: RadarGeometry,
  series: ChartSeries,
  seriesIndex: number,
): RenderNode[] {
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const points = seriesPoints(series, context, geometry);
  const path = seriesPath(points, geometry);
  return [
    createSeriesFill(context, geometry, series, path, color),
    createSeriesStroke(context, series, path, color),
    ...createSeriesPoints(context, series, points, color),
  ];
}

function seriesPoints(series: ChartSeries, context: ChartRenderContext, geometry: RadarGeometry): RadarPoint[] {
  const values = series.values as number[];
  return geometry.categories.map((_, categoryIndex) =>
    geometry.pointAt(geometry.radiusForValue(values[categoryIndex] ?? context.chart.axis_y.min), categoryIndex),
  );
}

function seriesPath(points: RadarPoint[], geometry: RadarGeometry): string {
  if (geometry.circular) {
    return freeformPathData(points, 0.5, true);
  }
  const commands = points.map((point, index) => `${index ? 'L ' : ''}${point.x} ${point.y}`);
  return `M ${commands.join(' ')} Z`;
}

function createSeriesFill(
  context: ChartRenderContext,
  geometry: RadarGeometry,
  series: ChartSeries,
  path: string,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'path',
    id: `chart-radar-fill-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    d: path,
    style: {
      fill: paint(color, diagnostics, chart.id),
      stroke: { kind: 'none' },
      opacity: Math.max(0, Math.min(1, series.opacity ?? geometry.areaOpacity)),
    },
  };
}

function createSeriesStroke(
  context: ChartRenderContext,
  series: ChartSeries,
  path: string,
  color: Parameters<typeof paint>[0],
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'path',
    id: `chart-radar-series-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    d: path,
    style: {
      fill: { kind: 'none' },
      stroke: paint(color, diagnostics, chart.id),
      strokeWidth: 2,
      lineJoin: 'round',
    },
  };
}

function createSeriesPoints(
  context: ChartRenderContext,
  series: ChartSeries,
  points: RadarPoint[],
  color: Parameters<typeof paint>[0],
): RenderNode[] {
  const { chart, bounds, diagnostics, nextOrder } = context;
  return points.map((point, pointIndex) => ({
    type: 'ellipse',
    id: `chart-radar-point-${chart.id}-${series.id}-${pointIndex}`,
    order: nextOrder(),
    bounds,
    cx: point.x,
    cy: point.y,
    rx: 3,
    ry: 3,
    style: { fill: paint(color, diagnostics, chart.id) },
  }));
}
