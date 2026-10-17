import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { finite } from '../../../scene';
import { chartText, contrastTextColor, zoneColorAtValue } from '../../primitives';
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
  return zoneColorAtValue(value, layout.bands, layout.zones);
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
  const id = `chart-heatmap-cell-${chart.id}-${cell.seriesId}-${cell.columnIndex}`;
  const style = {
    fill: { kind: 'solid' as const, color: cell.color },
    stroke: { kind: 'solid' as const, color: chart.config?.cellStrokeColor ?? chart.gridColor ?? '#e2e8f0' },
    strokeWidth: finite(chart.config?.cellStrokeWidth, finite(chart.gridWidth, 1)),
  };
  if (chart.config?.cellShape === 'circle') {
    return {
      type: 'ellipse',
      id,
      order: nextOrder(),
      bounds,
      cx: cell.frame.x + cell.frame.width / 2,
      cy: cell.frame.y + cell.frame.height / 2,
      rx: cell.frame.width / 2,
      ry: cell.frame.height / 2,
      style,
    };
  }
  return {
    type: 'rect',
    id,
    order: nextOrder(),
    bounds,
    ...cell.frame,
    rx: layout.grid.cellRadius,
    style,
  };
}

function createCellValueLabel(context: ChartRenderContext, layout: HeatmapLayout, cell: HeatmapCell): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const size = Math.max(6, finite(chart.config?.cellValueSize, layout.fontSize));
  return {
    ...chartText({
      id: `chart-heatmap-value-${chart.id}-${cell.seriesId}-${cell.columnIndex}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: cell.frame.x,
        y: cell.frame.y + cell.frame.height / 2 - size / 2,
        width: cell.frame.width,
        height: size + 2,
      },
      text: String(cell.value),
      chart,
      align: 'center',
    }),
    ...(chart.config?.cellValueSize === undefined ? {} : { fontSize: size }),
    color: chart.config?.cellValueColor ?? contrastTextColor(cell.color),
  };
}
