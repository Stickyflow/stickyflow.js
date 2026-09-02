import type { RenderNode } from '../scene';
import { DEFAULT_FONT } from '../scene';
import type { PositionedTableColumn, TableRenderContext } from './types';

export function renderHeaderCell(context: TableRenderContext, column: PositionedTableColumn): RenderNode[] {
  if (!context.table.show_header) {
    return [];
  }
  return [
    {
      type: 'text',
      id: `table-header-${context.table.id}-${column.id}`,
      order: context.order + 0.2,
      bounds: context.bounds,
      x: column.x + 6,
      y: context.table.y,
      width: Math.max(0, column.width - 12),
      height: context.rowHeight,
      lines: [column.label],
      fontFamily: context.table.font_family ?? DEFAULT_FONT,
      fontSize: context.table.font_size,
      fontWeight: context.table.font_weight,
      color: context.table.text_color,
      align: 'left',
      verticalAlign: 'middle',
      lineHeight: 1.2,
    },
  ];
}
