import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { finite } from '../../../scene';
import { bandIndexForValue, chartText, contrastTextColor, DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

interface HeatmapCell {
  seriesId: string;
  columnIndex: number;
  value: number;
  color: string;
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function renderHeatmapCells(context: ChartRenderContext, layout: HeatmapLayout): RenderNode[] {
  const nodes: RenderNode[] = [];
  layout.rows.forEach((series, rowIndex) => {
    nodes.push(...renderRowCells(context, layout, series, rowIndex));
  });
  return nodes;
}

function renderRowCells(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  series: ChartSeries,
  rowIndex: number,
): RenderNode[] {
  return layout.columns.flatMap((_, columnIndex) => {
    const cell = createHeatmapCell(layout, series, rowIndex, columnIndex);
    return renderHeatmapCell(context, layout, cell);
  });
}

function createHeatmapCell(
  layout: HeatmapLayout,
  series: ChartSeries,
  rowIndex: number,
  columnIndex: number,
): HeatmapCell {
  const value = (series.values as number[])[columnIndex] ?? 0;
  const { cellGap } = layout.grid;
  return {
    seriesId: series.id,
    columnIndex,
    value,
    color: colorForValue(value, layout),
    frame: {
      x: layout.grid.x + columnIndex * layout.grid.cellWidth + cellGap / 2,
      y: layout.grid.y + rowIndex * layout.grid.cellHeight + cellGap / 2,
      width: Math.max(0, layout.grid.cellWidth - cellGap),
      height: Math.max(0, layout.grid.cellHeight - cellGap),
    },
  };
}

function colorForValue(value: number, layout: HeatmapLayout): string {
  return layout.zones[bandIndexForValue(value, layout.bands)]?.color ?? DEFAULT_ZONE_FILL;
}

function renderHeatmapCell(context: ChartRenderContext, layout: HeatmapLayout, cell: HeatmapCell): RenderNode[] {
  const background = createCellBackground(context, layout, cell);
  if (context.chart.config?.showValues === false) {
    return [background];
  }
  return [background, createCellValueLabel(context, layout, cell)];
}

function createCellBackground(context: ChartRenderContext, layout: HeatmapLayout, cell: HeatmapCell): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-heatmap-cell-${chart.id}-${cell.seriesId}-${cell.columnIndex}`,
    order: nextOrder(),
    bounds,
    ...cell.frame,
    rx: layout.grid.cellRadius,
    style: {
      fill: { kind: 'solid', color: cell.color },
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: finite(chart.grid_width, 1),
    },
  };
}

function createCellValueLabel(context: ChartRenderContext, layout: HeatmapLayout, cell: HeatmapCell): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    ...chartText({
      id: `chart-heatmap-value-${chart.id}-${cell.seriesId}-${cell.columnIndex}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: cell.frame.x,
        y: cell.frame.y + cell.frame.height / 2 - layout.fontSize / 2,
        width: cell.frame.width,
        height: layout.fontSize + 2,
      },
      text: String(cell.value),
      chart,
      align: 'center',
    }),
    color: contrastTextColor(cell.color),
  };
}
