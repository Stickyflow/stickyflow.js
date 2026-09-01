import { finite } from '../../renderPrimitives';
import type { ChartRenderContext } from '../types';
import type { MekkoLayout } from './types';

const COLUMN_GAP = 4;

export function createMekkoLayout(context: ChartRenderContext): MekkoLayout {
  const { chart, plot, showLabels } = context;
  const columns = chart.config?.categories?.length
    ? chart.config.categories
    : ((chart.series[0]?.values as number[] | undefined)?.map((_, index) => String(index + 1)) ?? []);
  const fontSize = Math.max(9, finite(chart.font_size, 12));
  const labelGutterWidth = showLabels ? 30 : 0;
  const topGutter = showLabels ? 18 : 0;
  const bottomGutter = showLabels ? 32 : 0;
  const grid = {
    x: plot.x + labelGutterWidth,
    y: plot.y + topGutter,
    width: Math.max(1, plot.width - labelGutterWidth),
    height: Math.max(1, plot.height - topGutter - bottomGutter),
  };
  const columnTotals = columns.map((_, columnIndex) =>
    chart.series.reduce((sum, series) => sum + ((series.values as number[])[columnIndex] ?? 0), 0),
  );
  const grandTotal = columnTotals.reduce((sum, total) => sum + total, 0);
  const maxColumnTotal = Math.max(1, ...columnTotals);
  const totalGapWidth = COLUMN_GAP * Math.max(0, columns.length - 1);
  const availableWidth = Math.max(1, grid.width - totalGapWidth);
  const columnWidths = columnTotals.map(total =>
    grandTotal > 0 ? (total / grandTotal) * availableWidth : availableWidth / columns.length,
  );
  const columnX = calculateColumnPositions(columnWidths, grid.x);
  const columnHeights = columnTotals.map(total =>
    chart.config?.mekkoVaryHeight ? grid.height * (total / maxColumnTotal) : grid.height,
  );
  const columnY = columnHeights.map(height => grid.y + grid.height - height);

  return {
    columns,
    fontSize,
    smallFontSize: Math.max(8, fontSize - 1),
    labelGutterWidth,
    grid,
    columnTotals,
    columnWidths,
    columnX,
    columnHeights,
    columnY,
  };
}

function calculateColumnPositions(widths: number[], startX: number): number[] {
  const positions: number[] = [];
  widths.forEach((_, index) => {
    positions.push(index === 0 ? startX : positions[index - 1] + widths[index - 1] + COLUMN_GAP);
  });
  return positions;
}
