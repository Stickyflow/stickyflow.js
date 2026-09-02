import type { Chart } from '../../model/charts';
import { CHART_COLORS, chartText } from '../chartPrimitives';
import { finite, paint } from '../renderPrimitives';
import type { Bounds, RenderDiagnostic, RenderNode } from '../scene';
import type { ChartLayout } from './layout';

export function buildLegend(
  chart: Chart,
  plot: ChartLayout['plot'],
  bounds: Bounds,
  order: number,
  diagnostics: RenderDiagnostic[],
): RenderNode[] {
  if (chart.show_legend === false) {
    return [];
  }
  if (['heatmap', 'boxplot', 'sankey', 'treemap', 'mekko', 'matrix'].includes(chart.chart_type)) {
    return [];
  }

  const series =
    chart.chart_type === 'field'
      ? chart.series.filter(item => (item.values[0] as number[] | undefined)?.length === 4)
      : chart.series;
  const nodes: RenderNode[] = [];
  let x = plot.x + plot.width;

  [...series].reverse().forEach((item, reverseIndex) => {
    const seriesIndex = series.length - 1 - reverseIndex;
    const width = Math.max(42, item.label.length * finite(chart.font_size, 12) * 0.58 + 22);
    x -= width;
    nodes.push({
      type: 'rect',
      id: `chart-legend-swatch-${chart.id}-${item.id}`,
      order: order + nodes.length,
      bounds,
      x,
      y: chart.y + 16,
      width: 10,
      height: 10,
      rx: 3,
      style: { fill: paint(item.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length], diagnostics, chart.id) },
    });
    nodes.push(
      chartText({
        id: `chart-legend-${chart.id}-${item.id}`,
        order: order + nodes.length,
        bounds,
        frame: { x: x + 15, y: chart.y + 13, width: width - 15, height: 18 },
        text: item.label,
        chart,
      }),
    );
  });

  return nodes;
}
