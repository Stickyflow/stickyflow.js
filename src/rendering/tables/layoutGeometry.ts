import type { Table } from '../../model/table';

export function computeRowHeight(fontSize: number): number {
  return Math.max(24, fontSize * 1.8);
}

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
