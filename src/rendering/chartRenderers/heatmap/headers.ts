import type { ChartSeries } from '../../../model/charts';
import { chartText } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

export function renderHeatmapHeaders(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  return [...renderRowHeaders(context, layout), ...renderColumnHeaders(context, layout)];
}

function renderRowHeaders(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.rowHeaderWidth <= 0) {
    return [];
  }
  return layout.rows.map((series, rowIndex) => createRowHeader(context, layout, series, rowIndex));
}

function createRowHeader(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  series: ChartSeries,
  rowIndex: number,
): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  return chartText({
    id: `chart-heatmap-row-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    frame: {
      x: plot.x,
      y: layout.grid.y + rowIndex * layout.grid.cellHeight + layout.grid.cellHeight / 2 - layout.fontSize / 2,
      width: layout.rowHeaderWidth - 8,
      height: layout.fontSize + 2,
    },
    text: series.label,
    chart,
  });
}

function renderColumnHeaders(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.columnHeaderHeight <= 0) {
    return [];
  }
  return layout.columns.map((label, columnIndex) => createColumnHeader(context, layout, label, columnIndex));
}

function createColumnHeader(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  label: string,
  columnIndex: number,
): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  return chartText({
    id: `chart-heatmap-col-${chart.id}-${columnIndex}`,
    order: nextOrder(),
    bounds,
    frame: {
      x: layout.grid.x + columnIndex * layout.grid.cellWidth,
      y: plot.y,
      width: layout.grid.cellWidth,
      height: layout.fontSize + 2,
    },
    text: label,
    chart,
    align: 'center',
  });
}
