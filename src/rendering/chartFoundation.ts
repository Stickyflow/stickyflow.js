import type { Chart } from '../model/charts';
import { buildChartFrame } from './chartFrame';
import { type ChartLayout, chartLayout } from './chartLayout';
import { buildOrderedChartLegend } from './chartLegend';
import { createChartRenderContext } from './chartRenderContext';
import type { ChartRenderContext } from './chartRenderers';
import { ChartRenderOrder } from './chartRenderOrder';
import { buildChartTitle } from './chartTitle';
import { orderOf } from './renderPrimitives';
import type { RenderDiagnostic, RenderNode } from './scene';

export interface ChartFoundation {
  chart: Chart;
  layout: ChartLayout;
  context: ChartRenderContext;
  nodes: RenderNode[];
  renderOrder: ChartRenderOrder;
}

export function createChartFoundation(chart: Chart, index: number, diagnostics: RenderDiagnostic[]): ChartFoundation {
  const baseOrder = orderOf(chart, 20_000 + index);
  const layout = chartLayout(chart);
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
