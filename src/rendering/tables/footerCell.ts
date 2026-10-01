import type { RenderNode } from '../scene';
import { DEFAULT_FONT } from '../scene';
import { renderCellHitArea } from './cellHitArea';
import type { PositionedTableColumn, TableRenderContext } from './types';

export function renderFooterCell(context: TableRenderContext, column: PositionedTableColumn): RenderNode[] {
  if (!context.table.footer) {
    return [];
  }
  const prop = context.table.propertyPaths?.footer[column.id];
  return [
    ...renderCellHitArea(context, `table-footer-hit-${context.table.id}-${column.id}`, prop, {
      x: column.x,
      y: context.footerY,
      width: column.width,
      height: context.rowHeight,
    }),
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
      fontFamily: context.table.fontFamily ?? DEFAULT_FONT,
      fontSize: context.table.fontSize,
      fontWeight: 'bold',
      color: context.table.textColor,
      align: column.align ?? 'left',
      verticalAlign: 'middle',
      lineHeight: 1.2,
      prop,
      propKind: prop ? 'value' : undefined,
    },
  ];
}
