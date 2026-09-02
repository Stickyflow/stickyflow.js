import type { RenderNode } from '../scene';
import type { ChartFoundation } from './chartFoundation';
import { renderChartMarks } from './renderers';

export function buildUndecoratedChart(foundation: ChartFoundation): RenderNode[] {
  foundation.nodes.push(...renderChartMarks(foundation.context));
  return foundation.nodes;
}
