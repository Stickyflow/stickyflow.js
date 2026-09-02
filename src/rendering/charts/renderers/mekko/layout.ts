import { finite } from '../../../renderPrimitives';
import type { ChartRenderContext } from '../types';
import type { MekkoColumn, MekkoGrid, MekkoLayout } from './types';

const COLUMN_GAP = 4;

export function createMekkoLayout(context: ChartRenderContext): MekkoLayout {
  const labels = mekkoColumnLabels(context);
  const labelGutterWidth = context.showLabels ? 30 : 0;
  const grid = createMekkoGrid(context, labelGutterWidth);
  const fontSize = Math.max(9, finite(context.chart.font_size, 12));

  return {
    columns: createMekkoColumns(context, grid, labels),
    fontSize,
    smallFontSize: Math.max(8, fontSize - 1),
    labelGutterWidth,
    grid,
  };
}

function mekkoColumnLabels(context: ChartRenderContext): string[] {
  const { chart } = context;
  return chart.config?.categories?.length
    ? chart.config.categories
    : ((chart.series[0]?.values as number[] | undefined)?.map((_, index) => String(index + 1)) ?? []);
}

function createMekkoGrid(context: ChartRenderContext, labelGutterWidth: number): MekkoGrid {
  const topGutter = context.showLabels ? 18 : 0;
  const bottomGutter = context.showLabels ? 32 : 0;
  return {
    x: context.plot.x + labelGutterWidth,
    y: context.plot.y + topGutter,
    width: Math.max(1, context.plot.width - labelGutterWidth),
    height: Math.max(1, context.plot.height - topGutter - bottomGutter),
  };
}

function createMekkoColumns(context: ChartRenderContext, grid: MekkoGrid, labels: string[]): MekkoColumn[] {
  const totals = labels.map((_, columnIndex) =>
    context.chart.series.reduce((sum, series) => sum + ((series.values as number[])[columnIndex] ?? 0), 0),
  );
  const grandTotal = totals.reduce((sum, total) => sum + total, 0);
  const maximumTotal = Math.max(1, ...totals);
  const availableWidth = Math.max(1, grid.width - COLUMN_GAP * Math.max(0, labels.length - 1));
  let nextX = grid.x;

  return labels.map((label, index) => {
    const total = totals[index];
    const width = grandTotal > 0 ? (total / grandTotal) * availableWidth : availableWidth / labels.length;
    const height = context.chart.config?.mekkoVaryHeight ? grid.height * (total / maximumTotal) : grid.height;
    const column = { label, total, x: nextX, y: grid.y + grid.height - height, width, height };
    nextX += width + COLUMN_GAP;
    return column;
  });
}
