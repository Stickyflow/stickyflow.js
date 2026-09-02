import { axisBands, DEFAULT_HEATMAP_ZONES } from '../../chartPrimitives';
import { finite } from '../../renderPrimitives';
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
  return {
    rowHeaders: context.showLabels ? Math.min(96, Math.max(0, context.plot.width * 0.3)) : 0,
    columnHeaders: context.showLabels ? 24 : 0,
    legend: context.showLegend ? 22 : 0,
  };
}

function createHeatmapGrid(
  context: ChartRenderContext,
  reservedSpace: HeatmapReservedSpace,
  columnCount: number,
): HeatmapGrid {
  const width = Math.max(1, context.plot.width - reservedSpace.rowHeaders);
  const height = Math.max(1, context.plot.height - reservedSpace.columnHeaders - reservedSpace.legend);
  return {
    x: context.plot.x + reservedSpace.rowHeaders,
    y: context.plot.y + reservedSpace.columnHeaders,
    width,
    height,
    cellWidth: columnCount ? width / columnCount : width,
    cellHeight: context.chart.series.length ? height / context.chart.series.length : height,
  };
}
