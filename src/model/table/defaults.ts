import type { TableColumn, TableRow } from './types';

export const TABLE_CORNER_RADIUS = 12;

export function createDefaultColumns(): TableColumn[] {
  return [
    { id: 'col-1', label: 'Field', width: 150, type: 'text' },
    { id: 'col-2', label: 'Type', width: 120, type: 'text' },
    { id: 'col-3', label: 'Constraints', width: 150, type: 'text' },
  ];
}

export function createDefaultRows(columns: TableColumn[] = createDefaultColumns()): TableRow[] {
  const emptyCells = (): Record<string, string | boolean> => {
    const cells: Record<string, string | boolean> = {};
    columns.forEach(column => {
      cells[column.id] = column.type === 'boolean' ? false : '';
    });
    return cells;
  };
  return [
    { id: 'row-1', cells: { ...emptyCells(), 'col-1': 'id', 'col-2': 'uuid', 'col-3': 'PRIMARY KEY' } },
    { id: 'row-2', cells: emptyCells() },
  ];
}

export const TABLE_DEFAULTS = {
  width: 420,
  height: 200,
  title: 'Table',
  columns: createDefaultColumns(),
  rows: createDefaultRows(),
  stroke_color: '#475569',
  stroke_width: 1,
  dash: [] as number[],
  corner_radius: TABLE_CORNER_RADIUS,
  fill_color: '#ffffff',
  header_fill_color: '#f1f5f9',
  grid_color: '#cbd5e1',
  grid_width: 1,
  border_style: 'single' as const,
  header_rule_style: 'single' as const,
  show_horizontal_lines: true,
  show_vertical_lines: true,
  text_color: '#0f172a',
  font_family: 'Inter',
  font_size: 14,
  font_weight: 'bold' as const,
  row_height: 28,
  show_header: true,
  layer_group: 'background',
  order_key: 'e',
};
