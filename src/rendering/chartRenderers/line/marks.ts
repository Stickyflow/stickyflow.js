import type { ChartSeries } from '../../../model/charts';
import {
  createVerticalErrorWhiskerNode,
  errorBarRange,
  mapChartValue,
  representativeColor,
} from '../../chartPrimitives';
import { paint } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { CartesianPoint } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';

export function renderLineMarks(
  context: ChartRenderContext,
  series: ChartSeries,
  pairs: [number, number][],
  points: CartesianPoint[],
  color: NonNullable<ChartSeries['color']>,
): RenderNode[] {
  const nodes: RenderNode[] = [];
  points.forEach((point, pointIndex) => {
    const errorNode = createLineError(context, series, pairs, point, pointIndex, color);
    if (errorNode) {
      nodes.push(errorNode);
    }
    nodes.push(createLinePoint(context, series, point, pointIndex, color));
  });
  return nodes;
}

function createLineError(
  context: ChartRenderContext,
  series: ChartSeries,
  pairs: [number, number][],
  point: CartesianPoint,
  pointIndex: number,
  color: NonNullable<ChartSeries['color']>,
): RenderNode | null {
  const error = series.error?.[pointIndex];
  if (error == null) {
    return null;
  }
  const { chart, plot, bounds, nextOrder } = context;
  const [lower, upper] = errorBarRange(pairs[pointIndex][1], error);
  return createVerticalErrorWhiskerNode({
    id: `chart-line-error-${chart.id}-${series.id}-${pointIndex}`,
    order: nextOrder(),
    bounds,
    geometry: {
      centerX: point.x,
      startY: plot.y + plot.height - mapChartValue(lower, chart.axis_y, plot.height),
      endY: plot.y + plot.height - mapChartValue(upper, chart.axis_y, plot.height),
    },
    color: representativeColor(color, '#0f172a'),
    valueReference: { seriesId: series.id, valueIndex: pointIndex },
  });
}

function createLinePoint(
  context: ChartRenderContext,
  series: ChartSeries,
  point: CartesianPoint,
  pointIndex: number,
  color: NonNullable<ChartSeries['color']>,
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
    detail: { of: 'chartValue', series: series.id, valueIndex: pointIndex },
    style: { fill: paint(color, diagnostics, chart.id) },
  };
}
