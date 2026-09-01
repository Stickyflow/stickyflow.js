import type { ChartFoundation } from './chartFoundation';
import { buildChartAxes, buildChartGrid, buildChartRules } from './chartLayout';
import { renderChartMarks } from './chartRenderers';
import type { RenderNode } from './scene';

export function buildCartesianChart(foundation: ChartFoundation): RenderNode[] {
  const { chart, context, layout, nodes, renderOrder } = foundation;
  const gridNodes = buildChartGrid(chart, layout.plot, layout.bounds, renderOrder.current());
  nodes.push(...gridNodes);
  renderOrder.advance(gridNodes.length);

  nodes.push(...renderChartMarks(context));

  const ruleNodes = buildChartRules(chart, layout.plot, layout.bounds, renderOrder.current());
  nodes.push(...ruleNodes);
  renderOrder.advance(ruleNodes.length);

  nodes.push(...buildChartAxes(chart, layout, renderOrder.current()));
  return nodes;
}
