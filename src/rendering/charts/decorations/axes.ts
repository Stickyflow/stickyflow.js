import type { Chart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { buildAxisLabels } from './axisLabels';
import { buildBoxplotSeriesYAxisTicks } from './boxplotYAxis';
import { buildCategoricalXAxisTicks, buildSeriesXAxisTicks } from './categoricalXAxis';
import { type ChartLayout, hasCartesianDecorations } from './layout';
import { buildNumericXAxisTicks } from './numericXAxis';
import { buildNumericYAxisTicks } from './numericYAxis';

function isHorizontalBoxplot(chart: Chart): boolean {
  return chart.chartType === 'boxplot' && chart.config?.orientation === 'horizontal';
}

function buildXAxisTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (chart.chartType === 'bar') {
    return buildCategoricalXAxisTicks(chart, layout, order);
  }
  if (chart.chartType === 'boxplot' && !isHorizontalBoxplot(chart)) {
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
