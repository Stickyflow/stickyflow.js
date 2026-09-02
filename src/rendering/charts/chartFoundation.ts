import type { Chart } from '../../model/charts';
import { orderOf } from '../renderPrimitives';
import type { RenderDiagnostic, RenderNode } from '../scene';
import { buildChartFrame } from './chartFrame';
import { buildOrderedChartLegend } from './chartLegend';
import { createChartRenderContext } from './chartRenderContext';
import { ChartRenderOrder } from './chartRenderOrder';
import { buildChartTitle } from './chartTitle';
import { type ChartLayout, decorations } from './decorations';
import type { ChartRenderContext } from './renderers';

export interface ChartFoundation {
  chart: Chart;
  layout: ChartLayout;
  context: ChartRenderContext;
  nodes: RenderNode[];
  renderOrder: ChartRenderOrder;
}

export function createChartFoundation(chart: Chart, index: number, diagnostics: RenderDiagnostic[]): ChartFoundation {
  const baseOrder = orderOf(chart, 20_000 + index);
  const layout = decorations(chart);
  const renderOrder = new ChartRenderOrder(baseOrder);
  const nodes: RenderNode[] = [buildChartFrame(chart, layout.bounds, layout.plot, baseOrder)];
  nodes.push(...buildChartTitle(chart, layout.bounds, layout.plot, renderOrder));
  nodes.push(...buildOrderedChartLegend(chart, layout, renderOrder, diagnostics));

  return {
    chart,
    layout,
    nodes,
    renderOrder,
    context: createChartRenderContext(chart, layout, renderOrder, diagnostics),
  };
}
