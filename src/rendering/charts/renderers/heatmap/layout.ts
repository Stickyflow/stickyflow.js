import { estimateTextWidth } from '../../../../model/geometry/text';
import { finite } from '../../../scene';
import { axisBands, DEFAULT_HEATMAP_ZONES } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapGrid, HeatmapLayout, HeatmapReservedSpace } from './types';

export function createHeatmapLayout(context: ChartRenderContext): HeatmapLayout {
  const { chart } = context;
  const columns = heatmapColumns(context);
  const reservedSpace = heatmapReservedSpace(context);

  return {
    rows: chart.series,
    columns,
    bands: axisBands(chart.axis_y),
    zones: chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES,
    fontSize: Math.max(9, finite(chart.font_size, 12)),
    reservedSpace,
    grid: createHeatmapGrid(context, reservedSpace, columns.length),
  };
}

function heatmapColumns(context: ChartRenderContext): string[] {
  const { chart } = context;
  return chart.config?.categories?.length
    ? chart.config.categories
    : ((chart.series[0]?.values as number[] | undefined)?.map((_, index) => String(index + 1)) ?? []);
}

function heatmapReservedSpace(context: ChartRenderContext): HeatmapReservedSpace {
  const { chart } = context;
  const fontSize = Math.max(9, finite(chart.font_size, 12));
  // Sized to the longest row label plus a little breathing room, not a
  // fixed fraction of chart width - short labels like "Mon" no longer leave
  // a wide empty gap before the grid starts.
  const longestLabel = chart.series.reduce(
    (max, series) => Math.max(max, estimateTextWidth(series.label ?? '', fontSize, false)),
    0,
  );
  return {
    rowHeaders: context.showLabels ? Math.min(96, longestLabel + 12) : 0,
    columnHeaders: context.showLabels ? 24 : 0,
    // Gap to the legend (6) + the gradient bar itself (10) + tick marks (4)
    // + gap (2) + a boundary-value row below (~14).
    legend: context.showLegend ? 38 : 0,
  };
}

function createHeatmapGrid(
  context: ChartRenderContext,
  reservedSpace: HeatmapReservedSpace,
  columnCount: number,
): HeatmapGrid {
  const { chart } = context;
  const width = Math.max(1, context.plot.width - reservedSpace.rowHeaders);
  const height = Math.max(1, context.plot.height - reservedSpace.columnHeaders - reservedSpace.legend);
  const rowCount = chart.series.length;
  const cellGap = Math.max(0, finite(chart.config?.cellGap, 0));

  let cellWidth = columnCount ? width / columnCount : width;
  let cellHeight = rowCount ? height / rowCount : height;
  let gridWidth = width;
  let gridHeight = height;
  if (chart.config?.squareCells && columnCount && rowCount) {
    // Forces a 1:1 aspect ratio (a calendar/activity-graph grid, not a
    // table that happens to be colored) - the smaller of the two natural
    // cell dimensions wins, and the grid shrinks to fit exactly that many
    // square cells instead of stretching them to fill the reserved area.
    const cellSize = Math.min(cellWidth, cellHeight);
    cellWidth = cellSize;
    cellHeight = cellSize;
    gridWidth = cellSize * columnCount;
    gridHeight = cellSize * rowCount;
  }

  return {
    x: context.plot.x + reservedSpace.rowHeaders,
    y: context.plot.y + reservedSpace.columnHeaders,
    width: gridWidth,
    height: gridHeight,
    cellWidth,
    cellHeight,
    cellGap,
    // With no explicit barCornerRadius, rounding follows the gap itself (0
    // when cells touch) so "give cells a gap" reads as GitHub-activity
    // tiles out of the box, without needing both properties set.
    cellRadius: Math.max(0, finite(chart.config?.barCornerRadius, cellGap)),
  };
}
