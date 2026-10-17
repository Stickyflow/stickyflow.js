import type { ChartSeries } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { paint } from '../../scene';
import { CHART_COLORS, resolveChartShadow } from '../primitives';
import { type CartesianPoint, pixelPoints, seriesValuePairs } from './cartesianPoints';
import type { ChartRenderContext } from './types';

const DEFAULT_POINT_SIZE = 4;

export function renderScatter(context: ChartRenderContext): RenderNode[] {
  const nodes: RenderNode[] = [];
  const shadow = resolveChartShadow(context.chart.shadowStyle);
  context.chart.series.forEach((series, seriesIndex) => {
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    const points = pixelPoints(context, seriesValuePairs(context.chart, series));
    points.forEach((point, pointIndex) => {
      nodes.push(createScatterPoint(context, series, point, pointIndex, color, shadow));
    });
  });
  return nodes;
}

function createScatterPoint(
  context: ChartRenderContext,
  series: ChartSeries,
  point: CartesianPoint,
  pointIndex: number,
  color: Parameters<typeof paint>[0],
  shadow: ReturnType<typeof resolveChartShadow>,
): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const config = chart.config;
  const radius = config?.pointSize ?? DEFAULT_POINT_SIZE;
  const strokeWidth = config?.pointStrokeWidth ?? 0;
  return {
    type: 'ellipse',
    id: `chart-point-${chart.id}-${series.id}-${pointIndex}`,
    order: nextOrder(),
    bounds,
    cx: point.x,
    cy: point.y,
    rx: radius,
    ry: radius,
    detail: { of: 'chartValue', series: series.id, valueIndex: pointIndex },
    style: {
      fill: paint(color, diagnostics, chart.id),
      stroke: strokeWidth > 0 ? paint(config?.pointStrokeColor ?? color, diagnostics, chart.id) : undefined,
      strokeWidth: strokeWidth > 0 ? strokeWidth : undefined,
      opacity: config?.pointOpacity,
      shadow,
    },
  };
}
