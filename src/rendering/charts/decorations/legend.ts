import type { Chart, ChartSeries } from '../../../model/charts';
import { finite, paint } from '../../renderPrimitives';
import type { Bounds, RenderDiagnostic, RenderNode } from '../../scene';
import { CHART_COLORS, chartText } from '../primitives';
import type { ChartLayout } from './layout';

export interface ChartLegendRender {
  chart: Chart;
  plot: ChartLayout['plot'];
  bounds: Bounds;
  order: number;
  diagnostics: RenderDiagnostic[];
}

interface ChartLegendItem {
  series: ChartSeries;
  seriesIndex: number;
  x: number;
  width: number;
  order: number;
}

const CHARTS_WITH_OWN_LEGEND = new Set(['heatmap', 'boxplot', 'sankey', 'treemap', 'mekko', 'matrix']);

export function buildLegend(render: ChartLegendRender): RenderNode[] {
  if (!usesStandardLegend(render.chart)) {
    return [];
  }
  return createLegendItems(render).flatMap(item => renderLegendItem(render, item));
}

function usesStandardLegend(chart: Chart): boolean {
  return chart.show_legend !== false && !CHARTS_WITH_OWN_LEGEND.has(chart.chart_type);
}

function legendSeries(chart: Chart): ChartSeries[] {
  return chart.chart_type === 'field'
    ? chart.series.filter(item => (item.values[0] as number[] | undefined)?.length === 4)
    : chart.series;
}

function createLegendItems(render: ChartLegendRender): ChartLegendItem[] {
  const { chart, plot, order } = render;
  const series = legendSeries(chart);
  let nextX = plot.x + plot.width;
  return [...series].reverse().map((item, reverseIndex) => {
    const seriesIndex = series.length - 1 - reverseIndex;
    const width = Math.max(42, item.label.length * finite(chart.font_size, 12) * 0.58 + 22);
    nextX -= width;
    return { series: item, seriesIndex, x: nextX, width, order: order + reverseIndex * 2 };
  });
}

function renderLegendItem(render: ChartLegendRender, item: ChartLegendItem): RenderNode[] {
  return [createLegendSwatch(render, item), createLegendLabel(render, item)];
}

function createLegendSwatch(render: ChartLegendRender, item: ChartLegendItem): RenderNode {
  const { chart, bounds, diagnostics } = render;
  const color = item.series.color ?? CHART_COLORS[item.seriesIndex % CHART_COLORS.length];
  return {
    type: 'rect',
    id: `chart-legend-swatch-${chart.id}-${item.series.id}`,
    order: item.order,
    bounds,
    x: item.x,
    y: chart.y + 16,
    width: 10,
    height: 10,
    rx: 3,
    style: { fill: paint(color, diagnostics, chart.id) },
  };
}

function createLegendLabel(render: ChartLegendRender, item: ChartLegendItem): RenderNode {
  const { chart, bounds } = render;
  return chartText({
    id: `chart-legend-${chart.id}-${item.series.id}`,
    order: item.order + 1,
    bounds,
    frame: { x: item.x + 15, y: chart.y + 13, width: item.width - 15, height: 18 },
    text: item.series.label,
    chart,
  });
}
