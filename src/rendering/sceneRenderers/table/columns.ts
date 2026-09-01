import type { RenderNode } from '../../renderScene';
import { renderBodyCells } from './bodyCells';
import { renderFooterCell } from './footerCell';
import { renderHeaderCell } from './headerCell';
import { type TableRenderContext, tableGridStyle } from './types';

function renderColumnDivider(context: TableRenderContext, columnIndex: number): RenderNode[] {
  if (columnIndex === 0 || !(context.table.show_vertical_lines ?? true)) {
    return [];
  }
  const column = context.columns[columnIndex];
  return [
    {
      type: 'path',
      id: `table-column-${context.table.id}-${column.id}`,
      order: context.order + 0.1,
      bounds: context.bounds,
      d: `M ${column.x} ${context.table.y + context.gridInset} V ${context.table.y + context.height - context.gridInset}`,
      style: tableGridStyle(context),
    },
  ];
}

export function renderTableColumns(context: TableRenderContext): RenderNode[] {
  return context.columns.flatMap((column, columnIndex) => [
    ...renderColumnDivider(context, columnIndex),
    ...renderHeaderCell(context, column),
    ...renderBodyCells(context, column),
    ...renderFooterCell(context, column),
  ]);
}
