import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { chartText, labelAboveFrame, labelBelowFrame, labelTilt } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { columnGap, rowGap } from './layout';
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
  const { chart, bounds, nextOrder } = context;
  const room = layout.reservedSpace.rowHeaders;
  // Beside the grid, on the side that the names are set to; the room starts at the grid and runs outward.
  const gap = rowGap(chart);
  const x = layout.sides.rows === 'left' ? layout.grid.x - room : layout.grid.x + layout.grid.width + gap;
  return chartText({
    id: `chart-heatmap-row-${chart.id}-${series.id}`,
    order: nextOrder(),
    bounds,
    frame: {
      x,
      y: layout.grid.y + rowIndex * layout.grid.cellHeight + layout.grid.cellHeight / 2 - layout.headerFontSize / 2,
      width: Math.max(1, room - gap),
      height: layout.headerFontSize + 2,
    },
    text: series.label,
    chart,
    align: chart.axisLabelAlign ?? 'left',
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
  const { chart, bounds, nextOrder } = context;
  const above = layout.sides.columns === 'top';
  const centerX = layout.grid.x + (columnIndex + 0.5) * layout.grid.cellWidth;
  const tilt = labelTilt(chart);
  const gap = columnGap(chart);
  const id = `chart-heatmap-col-${chart.id}-${columnIndex}`;
  if (tilt > 0) {
    // Above the grid the names start at it and run up; below it they end at it and run down.
    const { frame, rotation } = above
      ? labelAboveFrame(chart, label, tilt, { x: centerX, y: layout.grid.y - gap })
      : labelBelowFrame(chart, label, tilt, { x: centerX, y: layout.grid.y + layout.grid.height + gap });
    return chartText({ id, order: nextOrder(), bounds, frame, text: label, chart, align: above ? 'left' : 'right', rotation, role: 'axis' });
  }
  return chartText({
    id,
    order: nextOrder(),
    bounds,
    frame: {
      x: layout.grid.x + columnIndex * layout.grid.cellWidth,
      y: above ? layout.grid.y - gap - (layout.headerFontSize + 2) : layout.grid.y + layout.grid.height + gap,
      width: layout.grid.cellWidth,
      height: layout.headerFontSize + 2,
    },
    text: label,
    chart,
    align: 'center',
    role: 'axis',
  });
}
