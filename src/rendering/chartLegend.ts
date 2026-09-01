import type { Chart } from '../model/charts';
import { buildLegend, type ChartLayout } from './chartLayout';
import type { ChartRenderOrder } from './chartRenderOrder';
import type { RenderDiagnostic, RenderNode } from './scene';

export function buildOrderedChartLegend(
  chart: Chart,
  layout: ChartLayout,
  renderOrder: ChartRenderOrder,
  diagnostics: RenderDiagnostic[],
): RenderNode[] {
  const nodes = buildLegend(chart, layout.plot, layout.bounds, renderOrder.current(), diagnostics);
  renderOrder.advance(nodes.length);
  return nodes;
}
