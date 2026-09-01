import type { Chart } from '../../model/charts';
import { chartText } from '../chartPrimitives';
import type { RenderNode } from '../scene';
import type { ChartLayout } from './layout';

function buildXAxisLabel(chart: Chart, layout: ChartLayout, order: number): RenderNode | null {
  if (!chart.axis_x.label) {
    return null;
  }
  return chartText(
    `chart-x-label-${chart.id}`,
    order,
    layout.bounds,
    layout.plot.x,
    chart.y + chart.height - 18,
    layout.plot.width,
    18,
    chart.axis_x.label,
    chart,
    'center',
  );
}

function buildYAxisLabel(chart: Chart, layout: ChartLayout, order: number): RenderNode | null {
  if (!chart.axis_y.label) {
    return null;
  }
  return chartText(
    `chart-y-label-${chart.id}`,
    order,
    layout.bounds,
    chart.x + 12,
    layout.plot.y + layout.plot.height,
    layout.plot.height,
    18,
    chart.axis_y.label,
    chart,
    'center',
    -90,
  );
}

export function buildAxisLabels(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  const labels: RenderNode[] = [];
  const xLabel = buildXAxisLabel(chart, layout, order);
  if (xLabel) {
    labels.push(xLabel);
  }
  const yLabel = buildYAxisLabel(chart, layout, order + labels.length);
  if (yLabel) {
    labels.push(yLabel);
  }
  return labels;
}
