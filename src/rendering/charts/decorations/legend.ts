import type { Chart, ChartSeries } from '../../../model/charts';
import type { Bounds, RenderDiagnostic, RenderNode } from '../../scene';
import { finite, paint } from '../../scene';
import { CHART_COLORS, chartText } from '../primitives';
import { seriesColorProp, seriesLabelProp } from '../propPath';
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
  y: number;
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

export const LEGEND_ROW_HEIGHT = 22;
export const LEGEND_COLUMN_GAP = 16;

export function isStackedLegendPosition(position: Chart['legend_position']): boolean {
  return position === 'bottomLeft' || position === 'bottomRight';
}

function legendItemWidths(chart: Chart): number[] {
  return legendSeries(chart).map(item => Math.max(42, item.label.length * finite(chart.font_size, 12) * 0.58 + 22));
}

export function stackedLegendColumnWidth(chart: Chart): number {
  const widths = legendItemWidths(chart);
  return widths.length ? Math.max(...widths) : 0;
}

function legendStartX(chart: Chart, plot: ChartLegendRender['plot'], totalWidth: number): number {
  if (chart.legend_position === 'bottom') {
    return plot.x + (plot.width - totalWidth) / 2;
  }
  return plot.x + plot.width - totalWidth;
}

function legendY(chart: Chart, plot: ChartLegendRender['plot']): number {
  return (chart.legend_position ?? 'top') === 'top' ? chart.y + 16 : plot.y + plot.height + 16;
}

function createStackedLegendItems(render: ChartLegendRender): ChartLegendItem[] {
  const { chart, plot, order } = render;
  const series = legendSeries(chart);
  const widths = legendItemWidths(chart);
  const maxWidth = Math.max(...widths);
  const x =
    chart.legend_position === 'bottomLeft'
      ? plot.x - LEGEND_COLUMN_GAP - maxWidth
      : plot.x + plot.width + LEGEND_COLUMN_GAP;
  // Mirrors 'top', which sits chart.y + 16 from the chart's own top edge -
  // the bottom-most row sits the same 16px in from the chart's own bottom
  // edge (not the plot's, which is pulled up by axis-label padding this
  // chart type may not even draw). Earlier items stack upward from there.
  const lastY = chart.y + chart.height - 26;
  return series.map((item, seriesIndex) => ({
    series: item,
    seriesIndex,
    x,
    y: lastY - (series.length - 1 - seriesIndex) * LEGEND_ROW_HEIGHT,
    width: widths[seriesIndex],
    order: order + (series.length - 1 - seriesIndex) * 2,
  }));
}

function createRowLegendItems(render: ChartLegendRender): ChartLegendItem[] {
  const { chart, plot, order } = render;
  const series = legendSeries(chart);
  const widths = legendItemWidths(chart);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  const y = legendY(chart, plot);
  let x = legendStartX(chart, plot, totalWidth);
  return series.map((item, seriesIndex) => {
    const width = widths[seriesIndex];
    const itemX = x;
    x += width;
    return { series: item, seriesIndex, x: itemX, y, width, order: order + (series.length - 1 - seriesIndex) * 2 };
  });
}

function createLegendItems(render: ChartLegendRender): ChartLegendItem[] {
  return isStackedLegendPosition(render.chart.legend_position)
    ? createStackedLegendItems(render)
    : createRowLegendItems(render);
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
    y: item.y,
    width: 10,
    height: 10,
    rx: 3,
    prop: seriesColorProp(item.series.id),
    propKind: 'color',
    style: { fill: paint(color, diagnostics, chart.id) },
  };
}

function createLegendLabel(render: ChartLegendRender, item: ChartLegendItem): RenderNode {
  const { chart, bounds } = render;
  return {
    ...chartText({
      id: `chart-legend-${chart.id}-${item.series.id}`,
      order: item.order + 1,
      bounds,
      frame: { x: item.x + 15, y: item.y - 3, width: item.width - 15, height: 18 },
      text: item.series.label,
      chart,
    }),
    prop: seriesLabelProp(item.series.id),
  };
}
