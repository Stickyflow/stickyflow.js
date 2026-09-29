import type { RenderNode } from '../../scene';
import { renderLineSeries, renderLineSeriesArea } from './line/series';
import type { ChartRenderContext } from './types';

export function renderLine(context: ChartRenderContext): RenderNode[] {
  const nodes: RenderNode[] = [];
  context.chart.series.forEach((series, seriesIndex) => {
    nodes.push(...renderLineSeriesArea(context, series, seriesIndex));
  });
  context.chart.series.forEach((series, seriesIndex) => {
    nodes.push(...renderLineSeries(context, series, seriesIndex));
  });
  return nodes;
}
