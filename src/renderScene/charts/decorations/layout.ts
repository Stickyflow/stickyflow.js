import type { Chart } from '../../../model/chart';
import { boxBounds, finite } from '../../scene';
import { isHorizontalBar, labelTilt, tiltedLabelRoom } from '../primitives';
import type { ChartLayout } from './chartLayout';
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
  return !CHARTS_WITHOUT_CARTESIAN_DECORATIONS.has(chart.chartType);
}

export function tickOffset(chart: Chart): number {
  return hasCartesianDecorations(chart) ? Math.max(0, finite(chart.tickLength, 0)) : 0;
}

// How far the labels stand from the plot: the length of the ticks and the distance that is asked for, along the x axis and along the y axis.
export function xLabelOffset(chart: Chart): number {
  return tickOffset(chart) + (hasCartesianDecorations(chart) ? Math.max(0, finite(chart.xLabelGap, 0)) : 0);
}

export function yLabelOffset(chart: Chart): number {
  return tickOffset(chart) + (hasCartesianDecorations(chart) ? Math.max(0, finite(chart.yLabelGap, 0)) : 0);
}

function isHorizontalBoxplot(chart: Chart): boolean {
  return chart.chartType === 'boxplot' && chart.config?.orientation === 'horizontal';
}

function boxplotCategoryLabelWidth(chart: Chart): number {
  const fontSize = finite(chart.fontSize, 12);
  const longest = Math.max(0, ...chart.series.map(series => (series.label || series.id).length));
  return longest * fontSize * 0.58 + 16;
}

const TREEMAP_SIDE_LEGEND_WIDTH = 66;

function treemapSideLegendSide(chart: Chart, showLegend: boolean): 'left' | 'right' | null {
  if (chart.chartType !== 'treemap' || !showLegend) {
    return null;
  }
  return chart.legendPosition === 'left' ? 'left' : chart.legendPosition === 'right' ? 'right' : null;
}

function barCategoryLabelWidth(chart: Chart): number {
  const fontSize = finite(chart.axisFontSize ?? chart.fontSize, 12);
  const categories = (chart.config as { categories?: string[] } | undefined)?.categories ?? [];
  return Math.max(0, ...categories.map(category => category.length)) * fontSize * 0.58 + 16;
}

function leftLabelWidth(chart: Chart): number {
  if (chart.axisLabelSpace && chart.axisLabelSpace > 0 && (isHorizontalBoxplot(chart) || isHorizontalBar(chart))) {
    return chart.axisLabelSpace;
  }
  if (isHorizontalBoxplot(chart)) {
    return boxplotCategoryLabelWidth(chart);
  }
  if (isHorizontalBar(chart)) {
    return chart.categoryAlign === 'left' || chart.categoryAlign === 'inside' ? 20 : barCategoryLabelWidth(chart);
  }
  if (chart.showValueAxis === false) {
    return 20;
  }
  return chart.axisY.label ? 60 : 46;
}

// Labels that stand up under the plot need more room than the one line they replace.
function tiltedBottomRoom(chart: Chart): number {
  const tilt = labelTilt(chart);
  if (tilt <= 0) {
    return 0;
  }
  const labels =
    chart.chartType === 'bar' && !isHorizontalBar(chart)
      ? ((chart.config as { categories?: string[] } | undefined)?.categories ?? [])
      : chart.chartType === 'boxplot' && !isHorizontalBoxplot(chart)
        ? chart.series.map(series => series.label || series.id)
        : [];
  return labels.length > 0 ? Math.max(0, tiltedLabelRoom(chart, labels, tilt) - 18) : 0;
}

export function decorations(chart: Chart): ChartLayout {
  const showLabels = chart.showAxisLabels !== false;
  const showLegend = chart.showLegend !== false;
  const legendPosition = chart.legendPosition ?? 'top';
  const legendAtTop = legendPosition === 'top';
  const hasLegendItems = showLegend && chart.series.length > 0;
  const legendStacked = hasLegendItems && isStackedLegendPosition(legendPosition);
  const sideColumnWidth = legendStacked ? stackedLegendColumnWidth(chart) + LEGEND_COLUMN_GAP : 0;
  const treemapSide = treemapSideLegendSide(chart, showLegend);

  const tickX = xLabelOffset(chart);
  const tickY = yLabelOffset(chart);
  const padLeft =
    tickY +
    (showLabels ? leftLabelWidth(chart) : 12) +
    (legendPosition === 'bottomLeft' ? sideColumnWidth : 0) +
    (treemapSide === 'left' ? TREEMAP_SIDE_LEGEND_WIDTH : 0);
  const padRight =
    24 +
    (legendPosition === 'bottomRight' ? sideColumnWidth : 0) +
    (treemapSide === 'right' ? TREEMAP_SIDE_LEGEND_WIDTH : 0);
  const valueRow =
    chart.chartType === 'bar' && chart.config?.showBarLabels === true && chart.config.barLabelPosition === 'axis';
  const horizontalValueAxis = isHorizontalBar(chart) && chart.showValueAxis !== false;
  const basePadBottom = showLabels
    ? isHorizontalBar(chart)
      ? horizontalValueAxis
        ? 34
        : 12
      : (chart.axisX.label ? 52 : 34) + (valueRow ? 18 : 0)
    : 12;
  const hasColorBar = chart.chartType === 'field' && showLegend && Boolean(chart.config?.scale?.stops.length);
  const legendAtBottomRow = hasLegendItems && !legendAtTop && !legendStacked;
  const padBottom =
    tickX +
    basePadBottom +
    (showLabels ? tiltedBottomRoom(chart) : 0) +
    (hasColorBar ? 44 : 0) +
    (legendAtBottomRow ? 16 + LEGEND_ROW_HEIGHT : 0);
  const titleHeight = chart.title ? Math.max(44, 20 + finite(chart.titleSize, 14) * 1.6) : 0;
  const padTop = titleHeight || (legendAtTop && hasLegendItems ? 44 : 24);

  return {
    bounds: boxBounds(
      { x: chart.x, y: chart.y, width: chart.width, height: chart.height },
      finite(chart.strokeWidth, 1) + 2,
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

export type { ChartLayout } from './chartLayout';
