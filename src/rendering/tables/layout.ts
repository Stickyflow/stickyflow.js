import { computeRowHeight, tableBorderGeometry } from '../../model/table';
import type { Table, TableColumn } from '../../model/tables';
import { boxBounds, orderOf } from '../scene';
import type { PositionedTableColumn, TableRenderContext } from './types';

export function columnWidthScale(table: Table): number {
  const total = table.columns.reduce((sum, column) => sum + column.width, 0);
  return total > 0 ? table.width / total : 1;
}

function normalizeColumns(table: Table): TableColumn[] {
  const scale = columnWidthScale(table);
  return table.columns.map(column => ({ ...column, width: column.width * scale }));
}

function positionColumns(table: Table): PositionedTableColumn[] {
  let x = table.x;
  return normalizeColumns(table).map((column, index) => {
    const positioned = { ...column, x, declaredWidth: table.columns[index].width };
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
    bounds: boxBounds({ x: table.x, y: table.y, width: table.width, height }, table.stroke_width + 4),
    columns: positionColumns(table),
  };
}
