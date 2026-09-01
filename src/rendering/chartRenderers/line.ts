import type { RenderNode } from '../renderScene';
import { renderLineSeries } from './line/series';
import type { ChartRenderContext } from './types';

export function renderLine(context: ChartRenderContext): RenderNode[] {
  const nodes: RenderNode[] = [];
  context.chart.series.forEach((series, seriesIndex) => {
    nodes.push(...renderLineSeries(context, series, seriesIndex));
  });
  return nodes;
}
