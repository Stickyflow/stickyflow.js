import type { RenderNode } from '../renderScene';
import { createBoxplotLayout } from './boxplot/layout';
import { renderBoxplotSeries } from './boxplot/series';
import type { ChartRenderContext } from './types';

export function renderBoxplot(context: ChartRenderContext): RenderNode[] {
  const layout = createBoxplotLayout(context);
  const nodes: RenderNode[] = [];

  context.chart.series.forEach((series, seriesIndex) => {
    nodes.push(...renderBoxplotSeries(context, layout, series, seriesIndex));
  });

  return nodes;
}
