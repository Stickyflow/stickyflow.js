import type { Chart } from '../../model/charts';
import type { RenderDiagnostic, RenderNode } from '../scene';
import type { ChartRenderOrder } from './chartRenderOrder';
import { buildLegend, type ChartLayout } from './decorations';

export function buildOrderedChartLegend(
  chart: Chart,
  layout: ChartLayout,
  renderOrder: ChartRenderOrder,
  diagnostics: RenderDiagnostic[],
): RenderNode[] {
  const nodes = buildLegend({
    chart,
    plot: layout.plot,
    bounds: layout.bounds,
    order: renderOrder.current(),
    diagnostics,
  });
  renderOrder.advance(nodes.length);
  return nodes;
}
