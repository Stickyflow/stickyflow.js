import type { ChartSeries } from '../../../model/charts';
import { bandIndexForValue, chartText, contrastTextColor, DEFAULT_ZONE_FILL } from '../../chartPrimitives';
import { finite } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { HeatmapLayout } from './types';

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
  const nodes: RenderNode[] = [];
  const values = series.values as number[];
  const y = layout.grid.y + rowIndex * layout.grid.cellHeight;

  layout.columns.forEach((_, columnIndex) => {
    const value = values[columnIndex] ?? 0;
    const color = colorForValue(value, layout);
    const x = layout.grid.x + columnIndex * layout.grid.cellWidth;
    nodes.push(createCellNode(context, layout, series.id, columnIndex, x, y, color));
    nodes.push(createValueLabel(context, layout, series.id, columnIndex, x, y, value, color));
  });

  return nodes;
}

function colorForValue(value: number, layout: HeatmapLayout): string {
  return layout.zones[bandIndexForValue(value, layout.bands)]?.color ?? DEFAULT_ZONE_FILL;
}

function createCellNode(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  seriesId: string,
  columnIndex: number,
  x: number,
  y: number,
  color: string,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-heatmap-cell-${chart.id}-${seriesId}-${columnIndex}`,
    order: nextOrder(),
    bounds,
    x,
    y,
    width: layout.grid.cellWidth,
    height: layout.grid.cellHeight,
    style: {
      fill: { kind: 'solid', color },
      stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
      strokeWidth: finite(chart.grid_width, 1),
    },
  };
}

function createValueLabel(
  context: ChartRenderContext,
  layout: HeatmapLayout,
  seriesId: string,
  columnIndex: number,
  x: number,
  y: number,
  value: number,
  color: string,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    ...chartText(
      `chart-heatmap-value-${chart.id}-${seriesId}-${columnIndex}`,
      nextOrder(),
      bounds,
      x,
      y + layout.grid.cellHeight / 2 - layout.fontSize / 2,
      layout.grid.cellWidth,
      layout.fontSize + 2,
      String(value),
      chart,
      'center',
    ),
    color: contrastTextColor(color),
  };
}
