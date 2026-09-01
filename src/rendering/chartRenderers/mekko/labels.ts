import { wrapText } from '../../../model/geometry/text';
import { chartText } from '../../chartPrimitives';
import type { RenderNode } from '../../renderScene';
import type { ChartRenderContext } from '../types';
import type { MekkoLayout } from './types';

export function renderMekkoColumnLabels(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
  label: string,
): RenderNode[] {
  if (!context.showLabels) {
    return [];
  }

  return [createTotalLabel(context, layout, columnIndex), createColumnLabel(context, layout, columnIndex, label)];
}

function createTotalLabel(context: ChartRenderContext, layout: MekkoLayout, columnIndex: number): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  return {
    ...chartText(
      `chart-mekko-total-${chart.id}-${columnIndex}`,
      nextOrder(),
      bounds,
      layout.columnX[columnIndex],
      plot.y,
      layout.columnWidths[columnIndex],
      layout.smallFontSize + 2,
      String(layout.columnTotals[columnIndex]),
      chart,
      'center',
    ),
    fontSize: layout.smallFontSize,
  };
}

function createColumnLabel(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
  label: string,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const width = layout.columnWidths[columnIndex];
  return {
    ...chartText(
      `chart-mekko-col-label-${chart.id}-${columnIndex}`,
      nextOrder(),
      bounds,
      layout.columnX[columnIndex],
      layout.grid.y + layout.grid.height + 4,
      width,
      layout.smallFontSize * 2 + 4,
      label,
      chart,
      'center',
    ),
    lines: wrapText(label, width, layout.smallFontSize),
    fontSize: layout.smallFontSize,
  };
}
