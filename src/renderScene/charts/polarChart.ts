import type { RenderNode } from '../scene';
import type { ChartFoundation } from './chartFoundation';
import { renderChartMarks } from './renderers';

export function buildPolarChart(foundation: ChartFoundation): RenderNode[] {
  foundation.nodes.push(...renderChartMarks(foundation.context));
  return foundation.nodes;
}
