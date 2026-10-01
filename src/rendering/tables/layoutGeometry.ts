import type { Table } from '../../model/table';

export function computeRowHeight(fontSize: number): number {
  return Math.max(24, fontSize * 1.8);
}

export function tableBorderGeometry(table: Pick<Table, 'borderStyle' | 'strokeWidth' | 'width'>) {
  const doubleBorderGap = Math.max(4, table.strokeWidth * 2 + 2);
  const gridInset =
    table.borderStyle === 'none'
      ? 0
      : table.borderStyle === 'double'
        ? doubleBorderGap + table.strokeWidth / 2
        : Math.max(1, table.strokeWidth / 2);
  return { doubleBorderGap, gridInset, gridSpan: Math.max(0, table.width - gridInset * 2) };
}
