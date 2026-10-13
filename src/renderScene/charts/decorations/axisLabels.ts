import type { Chart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { chartText } from '../primitives';
import { axisLabelProp } from '../propPath';
import type { ChartLayout } from './layout';

function buildXAxisLabel(chart: Chart, layout: ChartLayout, order: number): RenderNode | null {
  if (!chart.axisX.label) {
    return null;
  }
  return {
    ...chartText({
      role: 'axis',
      id: `chart-x-label-${chart.id}`,
      order,
      bounds: layout.bounds,
      frame: { x: layout.plot.x, y: chart.y + chart.height - 18, width: layout.plot.width, height: 18 },
      text: chart.axisX.label,
      chart,
      align: 'center',
    }),
    prop: axisLabelProp('x'),
  };
}

function buildYAxisLabel(chart: Chart, layout: ChartLayout, order: number): RenderNode | null {
  if (!chart.axisY.label) {
    return null;
  }
  return {
    ...chartText({
      role: 'axis',
      id: `chart-y-label-${chart.id}`,
      order,
      bounds: layout.bounds,
      frame: {
        x: chart.x + 12,
        y: layout.plot.y + layout.plot.height,
        width: layout.plot.height,
        height: 18,
      },
      text: chart.axisY.label,
      chart,
      align: 'center',
      rotation: -90,
    }),
    prop: axisLabelProp('y'),
  };
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
