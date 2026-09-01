import { axisBands, DEFAULT_HEATMAP_ZONES } from '../../chartPrimitives';
import { finite } from '../../renderPrimitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

export function createHeatmapLayout(context: ChartRenderContext): HeatmapLayout {
  const { chart, plot, showLabels, showLegend } = context;
  const rows = chart.series;
  const columns = chart.config?.categories?.length
    ? chart.config.categories
    : ((rows[0]?.values as number[] | undefined)?.map((_, index) => String(index + 1)) ?? []);
  const rowHeaderWidth = showLabels ? Math.min(96, Math.max(0, plot.width * 0.3)) : 0;
  const columnHeaderHeight = showLabels ? 24 : 0;
  const legendHeight = showLegend ? 22 : 0;
  const gridWidth = Math.max(1, plot.width - rowHeaderWidth);
  const gridHeight = Math.max(1, plot.height - columnHeaderHeight - legendHeight);

  return {
    rows,
    columns,
    bands: axisBands(chart.axis_y),
    zones: chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES,
    fontSize: Math.max(9, finite(chart.font_size, 12)),
    rowHeaderWidth,
    columnHeaderHeight,
    legendHeight,
    grid: {
      x: plot.x + rowHeaderWidth,
      y: plot.y + columnHeaderHeight,
      width: gridWidth,
      height: gridHeight,
      cellWidth: columns.length ? gridWidth / columns.length : gridWidth,
      cellHeight: rows.length ? gridHeight / rows.length : gridHeight,
    },
  };
}
