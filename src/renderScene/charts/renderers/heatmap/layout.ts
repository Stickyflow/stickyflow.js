import { finite } from '../../../scene';
import { estimateTextWidth } from '../../../scene/textLayout';
import { axisBands, DEFAULT_HEATMAP_ZONES, labelTilt, tiltedLabelRoom } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapGrid, HeatmapLayout, HeatmapReservedSpace, HeatmapSides } from './types';

export function createHeatmapLayout(context: ChartRenderContext): HeatmapLayout {
  const { chart } = context;
  const columns = heatmapColumns(context);
  const sides = heatmapSides(context);
  const reservedSpace = heatmapReservedSpace(context, sides);

  return {
    rows: chart.series,
    columns,
    bands: axisBands(chart.axisY),
    zones: chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES,
    fontSize: Math.max(9, finite(chart.fontSize, 12)),
    headerFontSize: headerFontSize(chart),
    legendGap: legendGap(chart),
    sides,
    reservedSpace,
    grid: createHeatmapGrid(context, reservedSpace, sides, columns.length),
  };
}

export const headerFontSize = (chart: ChartRenderContext['chart']) => Math.max(9, finite(chart.axisFontSize ?? chart.fontSize, 12));

// How far the names stand from the grid: the rows along the y axis, the columns along the x axis.
export const rowGap = (chart: ChartRenderContext['chart']) => Math.min(120, Math.max(0, finite(chart.yLabelGap, 6)));

export const columnGap = (chart: ChartRenderContext['chart']) => Math.min(120, Math.max(0, finite(chart.xLabelGap, 4)));

export const legendGap = (chart: ChartRenderContext['chart']) => Math.min(80, Math.max(0, finite(chart.legendGap, 6)));

// The names of the rows stand at the left, those of the columns at the top and the color bar below, unless the chart says otherwise.
function heatmapSides(context: ChartRenderContext): HeatmapSides {
  const { chart } = context;
  return {
    rows: chart.rowLabelSide === 'right' ? 'right' : 'left',
    columns: chart.columnLabelSide === 'bottom' ? 'bottom' : 'top',
    legend: chart.legendSide ?? 'bottom',
  };
}

function heatmapColumns(context: ChartRenderContext): string[] {
  const { chart } = context;
  return chart.config?.categories?.length
    ? chart.config.categories
    : ((chart.series[0]?.values as number[] | undefined)?.map((_, index) => String(index + 1)) ?? []);
}

// The bar and the numbers beside it take 32 pixels along a row or a column of the grid, or 56 beside it, and the distance to the grid.
const LEGEND_ACROSS = 32;
const LEGEND_BESIDE = 56;

function heatmapReservedSpace(context: ChartRenderContext, sides: HeatmapSides): HeatmapReservedSpace {
  const { chart } = context;
  const fontSize = headerFontSize(chart);
  const longestLabel = chart.series.reduce(
    (max, series) => Math.max(max, estimateTextWidth(series.label ?? '', fontSize, false)),
    0,
  );
  const vertical = sides.legend === 'left' || sides.legend === 'right';
  return {
    // The names get the room they ask for, or as much as the longest needs. They never take more than most of the plot.
    rowHeaders: context.showLabels
      ? Math.min(context.plot.width * 0.7, chart.axisLabelSpace && chart.axisLabelSpace > 0 ? chart.axisLabelSpace : longestLabel + 6 + rowGap(chart))
      : 0,
    columnHeaders: context.showLabels ? columnHeaderRoom(context) : 0,
    legend: context.showLegend ? (vertical ? LEGEND_BESIDE : LEGEND_ACROSS) + legendGap(chart) : 0,
  };
}

// Flat labels need one line; tilted ones need what they stand up to.
function columnHeaderRoom(context: ChartRenderContext): number {
  const { chart } = context;
  const tilt = labelTilt(chart);
  return tilt > 0
    ? Math.min(context.plot.height * 0.4, tiltedLabelRoom(chart, heatmapColumns(context), tilt) + columnGap(chart) + 4)
    : headerFontSize(chart) + 2 + columnGap(chart) + 6;
}

function createHeatmapGrid(
  context: ChartRenderContext,
  reservedSpace: HeatmapReservedSpace,
  sides: HeatmapSides,
  columnCount: number,
): HeatmapGrid {
  const { chart } = context;
  // What the names and the color bar take from each edge of the plot.
  const left = (sides.rows === 'left' ? reservedSpace.rowHeaders : 0) + (sides.legend === 'left' ? reservedSpace.legend : 0);
  const right = (sides.rows === 'right' ? reservedSpace.rowHeaders : 0) + (sides.legend === 'right' ? reservedSpace.legend : 0);
  const top = (sides.columns === 'top' ? reservedSpace.columnHeaders : 0) + (sides.legend === 'top' ? reservedSpace.legend : 0);
  const bottom =
    (sides.columns === 'bottom' ? reservedSpace.columnHeaders : 0) + (sides.legend === 'bottom' ? reservedSpace.legend : 0);
  const width = Math.max(1, context.plot.width - left - right);
  const height = Math.max(1, context.plot.height - top - bottom);
  const rowCount = chart.series.length;
  const cellGap = Math.max(0, finite(chart.config?.cellGap, 0));

  let cellWidth = columnCount ? width / columnCount : width;
  let cellHeight = rowCount ? height / rowCount : height;
  let gridWidth = width;
  let gridHeight = height;
  if (chart.config?.squareCells && columnCount && rowCount) {
    const cellSize = Math.min(cellWidth, cellHeight);
    cellWidth = cellSize;
    cellHeight = cellSize;
    gridWidth = cellSize * columnCount;
    gridHeight = cellSize * rowCount;
  }

  return {
    x: context.plot.x + left,
    y: context.plot.y + top,
    width: gridWidth,
    height: gridHeight,
    cellWidth,
    cellHeight,
    cellGap,
    cellRadius: Math.max(0, finite(chart.config?.barCornerRadius, cellGap)),
  };
}
