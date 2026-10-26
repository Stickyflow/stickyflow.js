import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { chartText, labelAboveFrame, labelTilt } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

export function renderHeatmapHeaders(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  return [...renderRowHeaders(context, layout), ...renderColumnHeaders(context, layout)];
}

function renderRowHeaders(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.reservedSpace.rowHeaders <= 0) {
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
      y: layout.grid.y + rowIndex * layout.grid.cellHeight + layout.grid.cellHeight / 2 - layout.headerFontSize / 2,
      width: layout.reservedSpace.rowHeaders - 8,
      height: layout.headerFontSize + 2,
    },
    text: series.label,
    chart,
    role: 'axis',
  });
}

function renderColumnHeaders(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  if (layout.reservedSpace.columnHeaders <= 0) {
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
  const tilt = labelTilt(chart);
  if (tilt > 0) {
    const { frame, rotation } = labelAboveFrame(chart, label, tilt, {
      x: layout.grid.x + (columnIndex + 0.5) * layout.grid.cellWidth,
      y: layout.grid.y - 4,
    });
    return chartText({ id: `chart-heatmap-col-${chart.id}-${columnIndex}`, order: nextOrder(), bounds, frame, text: label, chart, align: 'left', rotation, role: 'axis' });
  }
  return chartText({
    id: `chart-heatmap-col-${chart.id}-${columnIndex}`,
    order: nextOrder(),
    bounds,
    frame: {
      x: layout.grid.x + columnIndex * layout.grid.cellWidth,
      y: plot.y,
      width: layout.grid.cellWidth,
      height: layout.headerFontSize + 2,
    },
    text: label,
    chart,
    align: 'center',
    role: 'axis',
  });
}
