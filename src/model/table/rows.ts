import type { TableColumn, TableRow } from './types';

export function normalizeTableRows(columns: readonly TableColumn[], rows: readonly TableRow[]): TableRow[] {
  return rows.map(row => {
    const cells: TableRow['cells'] = {};
    columns.forEach(column => {
      cells[column.id] = row.cells[column.id] ?? '';
    });
    return { ...row, cells };
  });
}
