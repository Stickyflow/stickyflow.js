import type { Chart } from '../../../model/charts';
import type { Bounds } from '../../scene';
import { boxBounds, finite } from '../../scene';

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

export function decorations(chart: Chart): ChartLayout {
  const showLabels = chart.show_axis_labels !== false;
  const showLegend = chart.show_legend !== false;
  const padLeft = showLabels ? (chart.axis_y.label ? 60 : 46) : 12;
  const basePadBottom = showLabels ? (chart.axis_x.label ? 52 : 34) : 12;
  const hasColorBar = chart.chart_type === 'field' && showLegend && Boolean(chart.config?.scale?.stops.length);
  const padBottom = basePadBottom + (hasColorBar ? 34 : 0);
  const padTop = chart.title || (showLegend && chart.series.length) ? 44 : 24;

  return {
    bounds: boxBounds(
      { x: chart.x, y: chart.y, width: chart.width, height: chart.height },
      finite(chart.stroke_width, 1) + 2,
    ),
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
