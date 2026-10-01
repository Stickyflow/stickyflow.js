import type { Chart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { buildAxisLabels } from './axisLabels';
import { buildBoxplotSeriesYAxisTicks } from './boxplotYAxis';
import { buildCategoricalXAxisTicks, buildSeriesXAxisTicks } from './categoricalXAxis';
import { type ChartLayout, hasCartesianDecorations } from './layout';
import { buildNumericXAxisTicks } from './numericXAxis';
import { buildNumericYAxisTicks } from './numericYAxis';

function isHorizontalBoxplot(chart: Chart): boolean {
  return chart.chart_type === 'boxplot' && chart.config?.orientation === 'horizontal';
}

function buildXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (chart.chart_type === 'bar') {
    return buildCategoricalXAxisTicks(chart, layout, order);
  }
  if (chart.chart_type === 'boxplot' && !isHorizontalBoxplot(chart)) {
    return buildSeriesXAxisTicks(chart, layout, order);
  }
  return buildNumericXAxisTicks(chart, layout, order);
}

function buildYAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (isHorizontalBoxplot(chart)) {
    return buildBoxplotSeriesYAxisTicks(chart, layout, order);
  }
  return buildNumericYAxisTicks(chart, layout, order);
}

export function buildChartAxes(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (!layout.showLabels || !hasCartesianDecorations(chart)) {
    return [];
  }

  const xTicks = buildXAxisTicks(chart, layout, order);
  const yTicks = buildYAxisTicks(chart, layout, order + xTicks.length);
  const labels = buildAxisLabels(chart, layout, order + xTicks.length + yTicks.length);
  return [...xTicks, ...yTicks, ...labels];
}
