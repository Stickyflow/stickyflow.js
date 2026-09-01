import type { ChartSeries } from '../../model/charts';
import { CHART_COLORS } from '../chartPrimitives';
import { paint } from '../renderPrimitives';
import type { RenderNode } from '../scene';
import { type CartesianPoint, pixelPoints, seriesValuePairs } from './cartesianPoints';
import type { ChartRenderContext } from './types';

export function renderGrid(context: ChartRenderContext): RenderNode[] {
  const nodes: RenderNode[] = [];
  context.chart.series.forEach((series, seriesIndex) => {
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    const points = pixelPoints(context, seriesValuePairs(context.chart, series));
    points.forEach((point, pointIndex) => {
      nodes.push(createGridPoint(context, series, point, pointIndex, color));
    });
  });
  return nodes;
}

function createGridPoint(
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
