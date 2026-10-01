import type { Table, TableColumn, TableRow } from './types';

export const TABLE_MIN_COLUMN_WIDTH = 40;
export const TABLE_MIN_WIDTH = 200;

export function computeRowHeight(fontSize: number): number {
  return Math.max(24, fontSize * 1.8);
}

export function computeTableHeight(
  table: Pick<Table, 'font_size' | 'rows' | 'show_header' | 'row_height' | 'footer'>,
): number {
  const rowHeight = table.row_height ?? computeRowHeight(table.font_size);
  const headerHeight = table.show_header ? rowHeight : 0;
  const footerHeight = table.footer ? rowHeight : 0;
  return headerHeight + table.rows.length * rowHeight + footerHeight;
}

export const tableSlotCount = (table: Pick<Table, 'rows' | 'show_header' | 'footer'>): number =>
  Math.max(1, table.rows.length + (table.show_header ? 1 : 0) + (table.footer ? 1 : 0));

export const tableMinWidth = (columns: readonly TableColumn[]): number =>
  Math.max(TABLE_MIN_WIDTH, columns.length * TABLE_MIN_COLUMN_WIDTH);

export const tableRowHeight = (table: Pick<Table, 'font_size' | 'row_height'>): number =>
  Math.max(computeRowHeight(table.font_size), table.row_height ?? 0);

export const tableHeight = (
  table: Pick<Table, 'font_size' | 'row_height' | 'rows' | 'show_header' | 'footer'>,
): number => tableRowHeight(table) * tableSlotCount(table);

export const rowHeightForTableHeight = (
  height: number,
  table: Pick<Table, 'font_size' | 'rows' | 'show_header' | 'footer'>,
): number => Math.max(computeRowHeight(table.font_size), height / tableSlotCount(table));

export function tableBorderGeometry(table: Pick<Table, 'border_style' | 'stroke_width' | 'width'>) {
  const doubleBorderGap = Math.max(4, table.stroke_width * 2 + 2);
  const gridInset =
    table.border_style === 'none'
      ? 0
      : table.border_style === 'double'
        ? doubleBorderGap + table.stroke_width / 2
        : Math.max(1, table.stroke_width / 2);
  return { doubleBorderGap, gridInset, gridSpan: Math.max(0, table.width - gridInset * 2) };
}

export const tableResizeSnapshot = (table: Table): Partial<Table> => ({
  x: table.x,
  y: table.y,
  width: table.width,
  height: table.height,
  columns: table.columns.map(column => ({ ...column })),
  row_height: table.row_height,
});

export function normalizeTableRows(columns: readonly TableColumn[], rows: readonly TableRow[]): TableRow[] {
  return rows.map(row => {
    const cells: TableRow['cells'] = {};
    columns.forEach(column => {
      cells[column.id] = row.cells[column.id] ?? '';
    });
    return { ...row, cells };
  });
}
