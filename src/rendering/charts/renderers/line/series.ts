import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { CHART_COLORS } from '../../primitives';
import { pixelPoints, seriesValuePairs } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';
import { createLinePointMarks, renderLineMarks } from './marks';
import { createLinePath } from './path';

export function renderLineSeries(context: ChartRenderContext, series: ChartSeries, seriesIndex: number): RenderNode[] {
  const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
  const tension = context.chart.config?.lineTension ?? 0;
  const pairs = seriesValuePairs(context.chart, series);
  const points = pixelPoints(context, pairs);
  const nodes: RenderNode[] = [];
  if (points.length) {
    nodes.push(createLinePath(context, series, points, color, tension));
  }
  const marks = createLinePointMarks(series, pairs, points, color);
  nodes.push(...renderLineMarks(context, marks));
  return nodes;
}
