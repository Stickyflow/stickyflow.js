import { wrapText } from '../../../model/geometry/text';
import { chartText } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
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
    ...chartText({
      id: `chart-mekko-total-${chart.id}-${columnIndex}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: layout.columnX[columnIndex],
        y: plot.y,
        width: layout.columnWidths[columnIndex],
        height: layout.smallFontSize + 2,
      },
      text: String(layout.columnTotals[columnIndex]),
      chart,
      align: 'center',
    }),
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
    ...chartText({
      id: `chart-mekko-col-label-${chart.id}-${columnIndex}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: layout.columnX[columnIndex],
        y: layout.grid.y + layout.grid.height + 4,
        width,
        height: layout.smallFontSize * 2 + 4,
      },
      text: label,
      chart,
      align: 'center',
    }),
    lines: wrapText(label, width, layout.smallFontSize),
    fontSize: layout.smallFontSize,
  };
}
