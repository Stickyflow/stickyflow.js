import type { Chart } from '../../../model/charts';
import type { RenderNode } from '../../scene';
import { buildAxisLabels } from './axisLabels';
import { buildCategoricalXAxisTicks } from './categoricalXAxis';
import { type ChartLayout, hasCartesianDecorations } from './layout';
import { buildNumericXAxisTicks } from './numericXAxis';
import { buildNumericYAxisTicks } from './numericYAxis';

function buildXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chart.chart_type === 'bar'
    ? buildCategoricalXAxisTicks(chart, layout, order)
    : buildNumericXAxisTicks(chart, layout, order);
}

export function buildChartAxes(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (!layout.showLabels || !hasCartesianDecorations(chart)) {
    return [];
  }

  const xTicks = buildXAxisTicks(chart, layout, order);
  const yTicks = buildNumericYAxisTicks(chart, layout, order + xTicks.length);
  const labels = buildAxisLabels(chart, layout, order + xTicks.length + yTicks.length);
  return [...xTicks, ...yTicks, ...labels];
}
