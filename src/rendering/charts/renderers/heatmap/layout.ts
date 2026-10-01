import { estimateTextWidth } from '../../../../model/text';
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
  const longestLabel = chart.series.reduce(
    (max, series) => Math.max(max, estimateTextWidth(series.label ?? '', fontSize, false)),
    0,
  );
  return {
    rowHeaders: context.showLabels ? Math.min(96, longestLabel + 12) : 0,
    columnHeaders: context.showLabels ? 24 : 0,
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
    cellRadius: Math.max(0, finite(chart.config?.barCornerRadius, cellGap)),
  };
}
