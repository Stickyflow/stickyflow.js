import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { CHART_COLORS, representativeColor } from '../../primitives';
import { pixelPoints, seriesValuePairs } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';
import { createLineAreaFill } from './area';
import { createLinePointMarks, renderLineMarks } from './marks';
import { renderLineHighlights } from './highlights';
import { createLinePath } from './path';

function seriesColor(series: ChartSeries, seriesIndex: number): string {
  return representativeColor(series.color, CHART_COLORS[seriesIndex % CHART_COLORS.length]);
}

export function renderLineSeriesArea(
  context: ChartRenderContext,
  series: ChartSeries,
  seriesIndex: number,
): RenderNode[] {
  const areaOpacity = context.chart.config?.areaOpacity;
  if (areaOpacity === undefined || areaOpacity <= 0) {
    return [];
  }
  const color = seriesColor(series, seriesIndex);
  const tension = context.chart.config?.lineTension ?? 0;
  const points = pixelPoints(context, seriesValuePairs(context.chart, series));
  return points.length > 1 ? [createLineAreaFill(context, series, points, color, tension, areaOpacity)] : [];
}

export function renderLineSeries(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): RenderNode[] {
  const color = seriesColor(series, seriesIndex);
  const tension = context.chart.config?.lineTension ?? 0;
  const pairs = seriesValuePairs(context.chart, series);
  const points = pixelPoints(context, pairs);
  const nodes: RenderNode[] = [];
  if (points.length) {
    nodes.push(createLinePath(context, series, points, color, tension));
  }
  const marks = createLinePointMarks(series, pairs, points, color);
  nodes.push(...renderLineMarks(context, marks));
  nodes.push(...renderLineHighlights(context, series, color));
  return nodes;
}
