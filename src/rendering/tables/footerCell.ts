import type { RenderNode } from '../scene';
import { DEFAULT_FONT } from '../scene';
import type { PositionedTableColumn, TableRenderContext } from './types';

export function renderFooterCell(context: TableRenderContext, column: PositionedTableColumn): RenderNode[] {
  if (!context.table.footer) {
    return [];
  }
  return [
    {
      type: 'text',
      id: `table-footer-${context.table.id}-${column.id}`,
      order: context.order + 0.3,
      bounds: context.bounds,
      x: column.x + 6,
      y: context.footerY,
      width: Math.max(0, column.width - 12),
      height: context.rowHeight,
      lines: [String(context.table.footer.cells[column.id] ?? '')],
      fontFamily: context.table.font_family ?? DEFAULT_FONT,
      fontSize: context.table.font_size,
      fontWeight: 'bold',
      color: context.table.text_color,
      align: column.align ?? 'left',
      verticalAlign: 'middle',
      lineHeight: 1.2,
    },
  ];
}
