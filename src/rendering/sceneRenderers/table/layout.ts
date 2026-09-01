import { tableBorderGeometry } from '../../../model/geometry/tables';
import { computeRowHeight, type Table, type TableColumn } from '../../../model/tables';
import { boxBounds, orderOf } from '../../renderPrimitives';
import type { PositionedTableColumn, TableRenderContext } from './types';

function normalizeColumns(table: Table): TableColumn[] {
  const total = table.columns.reduce((sum, column) => sum + column.width, 0);
  if (total <= 0) {
    return table.columns;
  }
  return table.columns.map(column => ({ ...column, width: column.width * (table.width / total) }));
}

function positionColumns(table: Table): PositionedTableColumn[] {
  let x = table.x;
  return normalizeColumns(table).map(column => {
    const positioned = { ...column, x };
    x += column.width;
    return positioned;
  });
}

export function createTableRenderContext(table: Table, index: number): TableRenderContext {
  const rowHeight = table.row_height ?? computeRowHeight(table.font_size);
  const headerHeight = table.show_header ? rowHeight : 0;
  const footerHeight = table.footer ? rowHeight : 0;
  const height = headerHeight + table.rows.length * rowHeight + footerHeight;
  const { doubleBorderGap, gridInset } = tableBorderGeometry(table);
  return {
    table,
    order: orderOf(table, 7_000 + index),
    rowHeight,
    headerHeight,
    height,
    footerY: table.y + headerHeight + table.rows.length * rowHeight,
    doubleBorderGap,
    gridInset,
    bounds: boxBounds(table.x, table.y, table.width, height, table.stroke_width + 4),
    columns: positionColumns(table),
  };
}
