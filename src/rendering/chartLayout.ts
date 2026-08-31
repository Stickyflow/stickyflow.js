import type { Chart } from '../model/charts';
import { CHART_COLORS, chartText, chartTicks, mapChartValue } from './chartPrimitives';
import { boxBounds, finite, paint } from './renderPrimitives';
import type { Bounds, RenderDiagnostic, RenderNode, SceneStyle } from './renderScene';

export const CARTESIAN_VALUE_TYPES = new Set([
  'bar',
  'line',
  'scatter',
  'boxplot',
  'hexbin',
  'custom',
  'grid',
  'field',
]);
const CHARTS_WITHOUT_CARTESIAN_DECORATIONS = new Set(['heatmap', 'sankey', 'treemap', 'mekko', 'pie', 'matrix']);

export function hasCartesianDecorations(chart: Chart): boolean {
  return !CHARTS_WITHOUT_CARTESIAN_DECORATIONS.has(chart.chart_type);
}

export interface ChartLayout {
  bounds: Bounds;
  plot: { x: number; y: number; width: number; height: number };
  showLabels: boolean;
  showLegend: boolean;
  padLeft: number;
}

export function chartLayout(chart: Chart): ChartLayout {
  const showLabels = chart.show_axis_labels !== false;
  const showLegend = chart.show_legend !== false;
  const padLeft = showLabels ? (chart.axis_y.label ? 60 : 46) : 12;
  const basePadBottom = showLabels ? (chart.axis_x.label ? 52 : 34) : 12;
  const hasColorBar = chart.chart_type === 'field' && showLegend && Boolean(chart.config?.scale?.stops.length);
  const padBottom = basePadBottom + (hasColorBar ? 34 : 0);
  const padTop = chart.title || (showLegend && chart.series.length) ? 44 : 24;

  return {
    bounds: boxBounds(chart.x, chart.y, chart.width, chart.height, finite(chart.stroke_width, 1) + 2),
    plot: {
      x: chart.x + padLeft,
      y: chart.y + padTop,
      width: Math.max(1, chart.width - padLeft - 24),
      height: Math.max(1, chart.height - padTop - padBottom),
    },
    showLabels,
    showLegend,
    padLeft,
  };
}

export function buildChartRules(
  chart: Chart,
  plot: { x: number; y: number; width: number; height: number },
  bounds: Bounds,
  order: number,
): RenderNode[] {
  const rules = chart.rules;
  if (!rules?.length) return [];
  const nodes: RenderNode[] = [];
  let offset = 0;
  const fontSize = Math.max(9, finite(chart.font_size, 12) - 2);
  rules.forEach(rule => {
    const color = rule.color || chart.stroke_color || '#475569';
    const y = plot.y + plot.height - mapChartValue(rule.at, chart.axis_y, plot.height);
    nodes.push({
      type: 'path',
      id: `chart-rule-${chart.id}-${rule.id}`,
      order: order + offset++,
      bounds,
      d: `M ${plot.x} ${y} L ${plot.x + plot.width} ${y}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color },
        strokeWidth: rule.stroke_width ?? 1,
        dash: rule.dash,
      },
    });
    if (rule.text)
      nodes.push({
        ...chartText(
          `chart-rule-label-${chart.id}-${rule.id}`,
          order + offset++,
          bounds,
          plot.x + 4,
          y - fontSize - 2,
          160,
          fontSize + 2,
          rule.text,
          chart,
        ),
        color,
      });
  });
  return nodes;
}

export function buildLegend(
  chart: Chart,
  plot: ChartLayout['plot'],
  bounds: Bounds,
  order: number,
  diagnostics: RenderDiagnostic[],
): RenderNode[] {
  if (chart.show_legend === false) return [];
  if (['heatmap', 'boxplot', 'sankey', 'treemap', 'mekko', 'matrix'].includes(chart.chart_type)) return [];

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
      chartText(
        `chart-legend-${chart.id}-${item.id}`,
        order + nodes.length,
        bounds,
        x + 15,
        chart.y + 13,
        width - 15,
        18,
        item.label,
        chart,
      ),
    );
  });

  return nodes;
}

export function buildChartGrid(chart: Chart, plot: ChartLayout['plot'], bounds: Bounds, order: number): RenderNode[] {
  if (chart.show_grid === false || !hasCartesianDecorations(chart)) return [];

  const style: SceneStyle = { fill: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' } };
  const width = finite(chart.grid_width, 1);
  const nodes: RenderNode[] = [];
  chartTicks(chart.axis_x).forEach(tick => {
    const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width);
    nodes.push({
      type: 'rect',
      id: `chart-grid-x-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      x: x - width / 2,
      y: plot.y,
      width,
      height: plot.height,
      style,
    });
  });
  chartTicks(chart.axis_y).forEach(tick => {
    const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height);
    nodes.push({
      type: 'rect',
      id: `chart-grid-y-${chart.id}-${tick}`,
      order: order + nodes.length,
      bounds,
      x: plot.x,
      y: y - width / 2,
      width: plot.width,
      height: width,
      style,
    });
  });
  return nodes;
}

export function buildChartAxes(chart: Chart, layout: ChartLayout, order: number): RenderNode[] {
  if (!layout.showLabels || !hasCartesianDecorations(chart)) return [];

  const { bounds, plot, padLeft } = layout;
  const nodes: RenderNode[] = [];
  if (chart.chart_type === 'bar') {
    const count = Math.max(1, ...chart.series.map(series => series.values.length));
    const slot = plot.width / count;
    const labels = chart.config?.categories?.length
      ? chart.config.categories
      : Array.from({ length: count }, (_, index) => String(index + 1));
    for (let index = 0; index < count; index++) {
      const x = plot.x + (index + 0.5) * slot;
      nodes.push(
        chartText(
          `chart-x-tick-${chart.id}-${index}`,
          order + nodes.length,
          bounds,
          x - slot / 2,
          plot.y + plot.height + 4,
          slot,
          18,
          labels[index] ?? String(index + 1),
          chart,
          'center',
        ),
      );
    }
  } else {
    chartTicks(chart.axis_x).forEach(tick => {
      const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width);
      nodes.push(
        chartText(
          `chart-x-tick-${chart.id}-${tick}`,
          order + nodes.length,
          bounds,
          x - 20,
          plot.y + plot.height + 4,
          40,
          18,
          String(tick),
          chart,
          'center',
        ),
      );
    });
  }
  chartTicks(chart.axis_y).forEach(tick => {
    const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height);
    nodes.push(
      chartText(
        `chart-y-tick-${chart.id}-${tick}`,
        order + nodes.length,
        bounds,
        chart.x,
        y - 6,
        padLeft - 8,
        18,
        String(tick),
        chart,
        'right',
      ),
    );
  });
  if (chart.axis_x.label)
    nodes.push(
      chartText(
        `chart-x-label-${chart.id}`,
        order + nodes.length,
        bounds,
        plot.x,
        chart.y + chart.height - 18,
        plot.width,
        18,
        chart.axis_x.label,
        chart,
        'center',
      ),
    );
  if (chart.axis_y.label)
    nodes.push(
      chartText(
        `chart-y-label-${chart.id}`,
        order + nodes.length,
        bounds,
        chart.x + 12,
        plot.y + plot.height,
        plot.height,
        18,
        chart.axis_y.label,
        chart,
        'center',
        -90,
      ),
    );
  return nodes;
}
