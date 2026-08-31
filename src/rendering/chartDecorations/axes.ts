import type { Chart } from '../../model/charts';
import { chartText, chartTicks, mapChartValue } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import { type ChartLayout, hasCartesianDecorations } from './layout';

function buildBarTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  const count = Math.max(1, ...chart.series.map(series => series.values.length));
  const slot = layout.plot.width / count;
  const labels = chart.config?.categories?.length
    ? chart.config.categories
    : Array.from({ length: count }, (_, index) => String(index + 1));

  return Array.from({ length: count }, (_, index) => {
    const x = layout.plot.x + (index + 0.5) * slot;
    return chartText(
      `chart-x-tick-${chart.id}-${index}`,
      order + index,
      layout.bounds,
      x - slot / 2,
      layout.plot.y + layout.plot.height + 4,
      slot,
      18,
      labels[index] ?? String(index + 1),
      chart,
      'center',
    );
  });
}

function buildNumericXTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axis_x).map((tick, index) => {
    const x = layout.plot.x + mapChartValue(tick, chart.axis_x, layout.plot.width);
    return chartText(
      `chart-x-tick-${chart.id}-${tick}`,
      order + index,
      layout.bounds,
      x - 20,
      layout.plot.y + layout.plot.height + 4,
      40,
      18,
      String(tick),
      chart,
      'center',
    );
  });
}

function buildYTicks(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  return chartTicks(chart.axis_y).map((tick, index) => {
    const y = layout.plot.y + layout.plot.height - mapChartValue(tick, chart.axis_y, layout.plot.height);
    return chartText(
      `chart-y-tick-${chart.id}-${tick}`,
      order + index,
      layout.bounds,
      chart.x,
      y - 6,
      layout.padLeft - 8,
      18,
      String(tick),
      chart,
      'right',
    );
  });
}

function buildAxisLabels(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  const nodes: RenderNode[] = [];
  if (chart.axis_x.label) {
    nodes.push(
      chartText(
        `chart-x-label-${chart.id}`,
        order + nodes.length,
        layout.bounds,
        layout.plot.x,
        chart.y + chart.height - 18,
        layout.plot.width,
        18,
        chart.axis_x.label,
        chart,
        'center',
      ),
    );
  }
  if (chart.axis_y.label) {
    nodes.push(
      chartText(
        `chart-y-label-${chart.id}`,
        order + nodes.length,
        layout.bounds,
        chart.x + 12,
        layout.plot.y + layout.plot.height,
        layout.plot.height,
        18,
        chart.axis_y.label,
        chart,
        'center',
        -90,
      ),
    );
  }
  return nodes;
}

export function buildChartAxes(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (!layout.showLabels || !hasCartesianDecorations(chart)) {
    return [];
  }

  const xTicks =
    chart.chart_type === 'bar' ? buildBarTicks(chart, layout, order) : buildNumericXTicks(chart, layout, order);
  const yTicks = buildYTicks(chart, layout, order + xTicks.length);
  const labels = buildAxisLabels(chart, layout, order + xTicks.length + yTicks.length);
  return [...xTicks, ...yTicks, ...labels];
}
