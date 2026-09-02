import type { ChartFoundation } from './chartFoundation';
import { renderChartMarks } from './chartRenderers';
import type { RenderNode } from './scene';

export function buildPolarChart(foundation: ChartFoundation): RenderNode[] {
  foundation.nodes.push(...renderChartMarks(foundation.context));
  return foundation.nodes;
}
