import { finite } from '../../../scene';
import type { ChartRenderContext } from '../types';
import type { MekkoColumn, MekkoGrid, MekkoLayout } from './types';

export function createMekkoLayout(context: ChartRenderContext): MekkoLayout {
  const labels = mekkoColumnLabels(context);
  const labelGutterWidth = context.showLabels ? 30 : 0;
  const grid = createMekkoGrid(context, labelGutterWidth);
  const fontSize = Math.max(9, finite(context.chart.fontSize, 12));
  const columnGap = Math.max(0, finite(context.chart.config?.mekkoColumnGap, 4));
  const smallFontSize = Math.max(8, fontSize - 1);

  return {
    columns: createMekkoColumns(context, grid, labels, columnGap),
    fontSize,
    smallFontSize,
    labelGutterWidth,
    columnGap,
    labelSize: Math.max(6, finite(context.chart.config?.mekkoLabelSize, smallFontSize)),
    valueSize: Math.max(6, finite(context.chart.config?.mekkoValueSize, smallFontSize)),
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

function createMekkoColumns(
  context: ChartRenderContext,
  grid: MekkoGrid,
  labels: string[],
  columnGap: number,
): MekkoColumn[] {
  const totals = labels.map((_, columnIndex) =>
    context.chart.series.reduce((sum, series) => sum + ((series.values as number[])[columnIndex] ?? 0), 0),
  );
  const grandTotal = totals.reduce((sum, total) => sum + total, 0);
  const maximumTotal = Math.max(1, ...totals);
  const availableWidth = Math.max(1, grid.width - columnGap * Math.max(0, labels.length - 1));
  let nextX = grid.x;

  return labels.map((label, index) => {
    const total = totals[index];
    const width = grandTotal > 0 ? (total / grandTotal) * availableWidth : availableWidth / labels.length;
    const height = context.chart.config?.mekkoVaryHeight ? grid.height * (total / maximumTotal) : grid.height;
    const column = { label, total, x: nextX, y: grid.y + grid.height - height, width, height };
    nextX += width + columnGap;
    return column;
  });
}
