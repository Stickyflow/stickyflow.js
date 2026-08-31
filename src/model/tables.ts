import type { ChartRamp } from './charts';

export interface TableColumn {
  id: string;
  label: string;
  width: number;
  type: 'text' | 'boolean' | 'number';
  align?: 'left' | 'center' | 'right';
  scale?: ChartRamp;
}

export interface TableRow {
  id: string;
  cells: Record<string, string | boolean>;
}

export interface Table {
  id: string;
  board_id: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;

  columns: TableColumn[];
  rows: TableRow[];
  footer?: TableRow;

  stroke_color: string;
  stroke_width: number;
  dash: number[];
  corner_radius: number;
  fill_color: string;
  header_fill_color?: string;
  grid_color?: string;
  grid_width?: number;
  border_style?: 'none' | 'single' | 'double';
  header_rule_style?: 'none' | 'single' | 'double';
  show_horizontal_lines?: boolean;
  show_vertical_lines?: boolean;

  text_color: string;
  font_family?: string;
  font_size: number;
  font_weight: 'normal' | 'bold';
  row_height?: number;
  show_header: boolean;

  layer_group: string;
  order_key: string;
  is_visible: boolean;
  is_locked: boolean;

  entity_group_id?: string | null;

  created_at: string;
  updated_at?: string | null;
}

export interface TableCreate {
  id?: string;
  name?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  title?: string | null;
  columns?: TableColumn[];
  rows?: TableRow[];
  stroke_color?: string;
  stroke_width?: number;
  dash?: number[];
  corner_radius?: number;
  fill_color?: string;
  header_fill_color?: string;
  grid_color?: string;
  grid_width?: number;
  border_style?: 'none' | 'single' | 'double';
  header_rule_style?: 'none' | 'single' | 'double';
  show_horizontal_lines?: boolean;
  show_vertical_lines?: boolean;
  text_color?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  row_height?: number;
  show_header?: boolean;
  layer_group?: string;
  order_key?: string;
  entity_group_id?: string | null;
}

export interface TableUpdate {
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  title?: string | null;
  columns?: TableColumn[];
  rows?: TableRow[];
  stroke_color?: string;
  stroke_width?: number;
  dash?: number[];
  corner_radius?: number;
  fill_color?: string;
  header_fill_color?: string;
  grid_color?: string;
  grid_width?: number;
  border_style?: 'none' | 'single' | 'double';
  header_rule_style?: 'none' | 'single' | 'double';
  show_horizontal_lines?: boolean;
  show_vertical_lines?: boolean;
  text_color?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  row_height?: number;
  show_header?: boolean;
  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;
  entity_group_id?: string | null;
}

export const TABLE_CORNER_RADIUS = 12;
export const TABLE_MIN_COLUMN_WIDTH = 40;
export const TABLE_MIN_WIDTH = 200;

export function computeRowHeight(fontSize: number): number {
  return Math.max(24, fontSize * 1.8);
}

export function computeTableHeight(table: {
  font_size: number;
  rows: TableRow[];
  show_header: boolean;
  row_height?: number;
  footer?: TableRow | null;
}): number {
  const rowHeight = table.row_height ?? computeRowHeight(table.font_size);
  const headerHeight = table.show_header ? rowHeight : 0;
  const footerHeight = table.footer ? rowHeight : 0;
  return headerHeight + table.rows.length * rowHeight + footerHeight;
}

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
    columns.forEach(col => {
      cells[col.id] = col.type === 'boolean' ? false : '';
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
