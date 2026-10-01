import type { RenderNode } from '../../../scene';
import { wrapText } from '../../../scene/textLayout';
import { chartText } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { MekkoColumn, MekkoLayout } from './types';

export function renderMekkoColumnLabels(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
  column: MekkoColumn,
): RenderNode[] {
  if (!context.showLabels) {
    return [];
  }

  return [
    createTotalLabel(context, layout, columnIndex, column),
    createColumnLabel(context, layout, columnIndex, column),
  ];
}

function createTotalLabel(
  context: ChartRenderContext,
  layout: MekkoLayout,
  columnIndex: number,
  column: MekkoColumn,
): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  return {
    ...chartText({
      id: `chart-mekko-total-${chart.id}-${columnIndex}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: column.x,
        y: plot.y,
        width: column.width,
        height: layout.smallFontSize + 2,
      },
      text: String(column.total),
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
  column: MekkoColumn,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const { label, width } = column;
  return {
    ...chartText({
      id: `chart-mekko-col-label-${chart.id}-${columnIndex}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: column.x,
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
