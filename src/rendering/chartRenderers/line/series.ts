import type { ChartSeries } from '../../../model/charts';
import { CHART_COLORS } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
import { pixelPoints, seriesValuePairs } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';
import { renderLineMarks } from './marks';
import { createLinePath } from './path';

export function renderLineSeries(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): RenderNode[] {
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const pairs = seriesValuePairs(context.chart, series);
  const points = pixelPoints(context, pairs);
  const nodes: RenderNode[] = [];
  if (points.length) {
    nodes.push(createLinePath(context, series, points, color));
  }
  nodes.push(...renderLineMarks(context, series, pairs, points, color));
  return nodes;
}
