import type { Chart } from '../../../model/charts';
import type { Bounds } from '../../scene';
import { boxBounds, finite } from '../../scene';
import { isStackedLegendPosition, LEGEND_COLUMN_GAP, LEGEND_ROW_HEIGHT, stackedLegendColumnWidth } from './legend';

export const CARTESIAN_VALUE_TYPES = new Set(['bar', 'line', 'scatter', 'boxplot', 'hexbin', 'custom', 'field']);
const CHARTS_WITHOUT_CARTESIAN_DECORATIONS = new Set([
  'heatmap',
  'sankey',
  'treemap',
  'mekko',
  'pie',
  'radialBar',
  'polarArea',
]);

export function hasCartesianDecorations(chart: Chart): boolean {
  return !CHARTS_WITHOUT_CARTESIAN_DECORATIONS.has(chart.chart_type);
}

function isHorizontalBoxplot(chart: Chart): boolean {
  return chart.chart_type === 'boxplot' && chart.config?.orientation === 'horizontal';
}

function boxplotCategoryLabelWidth(chart: Chart): number {
  const fontSize = finite(chart.font_size, 12);
  const longest = Math.max(0, ...chart.series.map(series => (series.label || series.id).length));
  return longest * fontSize * 0.58 + 16;
}

const TREEMAP_SIDE_LEGEND_WIDTH = 66;

function treemapSideLegendSide(chart: Chart, showLegend: boolean): 'left' | 'right' | null {
  if (chart.chart_type !== 'treemap' || !showLegend) {
    return null;
  }
  return chart.legend_position === 'left' ? 'left' : chart.legend_position === 'right' ? 'right' : null;
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
  const legendPosition = chart.legend_position ?? 'top';
  const legendAtTop = legendPosition === 'top';
  const hasLegendItems = showLegend && chart.series.length > 0;
  const legendStacked = hasLegendItems && isStackedLegendPosition(legendPosition);
  const sideColumnWidth = legendStacked ? stackedLegendColumnWidth(chart) + LEGEND_COLUMN_GAP : 0;
  const treemapSide = treemapSideLegendSide(chart, showLegend);

  const padLeft =
    (showLabels ? (isHorizontalBoxplot(chart) ? boxplotCategoryLabelWidth(chart) : chart.axis_y.label ? 60 : 46) : 12) +
    (legendPosition === 'bottomLeft' ? sideColumnWidth : 0) +
    (treemapSide === 'left' ? TREEMAP_SIDE_LEGEND_WIDTH : 0);
  const padRight =
    24 +
    (legendPosition === 'bottomRight' ? sideColumnWidth : 0) +
    (treemapSide === 'right' ? TREEMAP_SIDE_LEGEND_WIDTH : 0);
  const basePadBottom = showLabels ? (chart.axis_x.label ? 52 : 34) : 12;
  const hasColorBar = chart.chart_type === 'field' && showLegend && Boolean(chart.config?.scale?.stops.length);
  const legendAtBottomRow = hasLegendItems && !legendAtTop && !legendStacked;
  const padBottom = basePadBottom + (hasColorBar ? 44 : 0) + (legendAtBottomRow ? 16 + LEGEND_ROW_HEIGHT : 0);
  const padTop = chart.title || (legendAtTop && hasLegendItems) ? 44 : 24;

  return {
    bounds: boxBounds(
      { x: chart.x, y: chart.y, width: chart.width, height: chart.height },
      finite(chart.stroke_width, 1) + 2,
    ),
    plot: {
      x: chart.x + padLeft,
      y: chart.y + padTop,
      width: Math.max(1, chart.width - padLeft - padRight),
      height: Math.max(1, chart.height - padTop - padBottom),
    },
    showLabels,
    showLegend,
    padLeft,
  };
}
