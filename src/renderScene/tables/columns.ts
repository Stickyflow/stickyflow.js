import type { RenderNode } from '../scene';
import { renderBodyCells } from './bodyCells';
import { renderFooterCell } from './footerCell';
import { renderHeaderCell } from './headerCell';
import { columnWidthScale } from './layout';
import { type TableRenderContext, tableGridStyle } from './types';

const COLUMN_RESIZE_HIT_WIDTH = 10;

function renderColumnDivider(context: TableRenderContext, columnIndex: number): RenderNode[] {
  if (columnIndex === 0 || !(context.table.showVerticalLines ?? true)) {
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

function renderColumnResizeHandle(context: TableRenderContext, columnIndex: number): RenderNode[] {
  if (columnIndex === 0) {
    return [];
  }
  const column = context.columns[columnIndex];
  const resizedColumn = context.columns[columnIndex - 1];
  return [
    {
      type: 'rect',
      id: `table-column-resize-${context.table.id}-${resizedColumn.id}`,
      order: context.order + 0.5,
      bounds: context.bounds,
      x: column.x - COLUMN_RESIZE_HIT_WIDTH / 2,
      y: context.table.y,
      width: COLUMN_RESIZE_HIT_WIDTH,
      height: context.height,
      style: { fill: { kind: 'solid', color: 'transparent' }, stroke: { kind: 'none' } },
      detail: {
        of: 'tableColumnDivider',
        columnId: resizedColumn.id,
        startWidth: resizedColumn.declaredWidth,
        widthScale: columnWidthScale(context.table),
      },
    },
  ];
}

export function renderTableColumns(context: TableRenderContext): RenderNode[] {
  return context.columns.flatMap((column, columnIndex) => [
    ...renderColumnDivider(context, columnIndex),
    ...renderColumnResizeHandle(context, columnIndex),
    ...renderHeaderCell(context, column),
    ...renderBodyCells(context, column),
    ...renderFooterCell(context, column),
  ]);
}
