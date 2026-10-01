import type { RenderNode } from '../scene';
import { DEFAULT_FONT } from '../scene';
import { renderCellHitArea } from './cellHitArea';
import type { PositionedTableColumn, TableRenderContext } from './types';

export function renderHeaderCell(context: TableRenderContext, column: PositionedTableColumn): RenderNode[] {
  if (!context.table.showHeader) {
    return [];
  }
  const prop = context.table.propertyPaths?.header[column.id];
  return [
    ...renderCellHitArea(context, `table-header-hit-${context.table.id}-${column.id}`, prop, {
      x: column.x,
      y: context.table.y,
      width: column.width,
      height: context.rowHeight,
    }),
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
      fontFamily: context.table.fontFamily ?? DEFAULT_FONT,
      fontSize: context.table.fontSize,
      fontWeight: context.table.fontWeight,
      color: context.table.textColor,
      align: 'left',
      verticalAlign: 'middle',
      lineHeight: 1.2,
      prop,
      propKind: prop ? 'value' : undefined,
    },
  ];
}
