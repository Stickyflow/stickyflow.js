import type { ChartRamp } from '../chart';

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
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  columns: TableColumn[];
  rows: TableRow[];
  footer?: TableRow;
  columns_block_name?: string;
  rows_block_name?: string;
  footer_block_name?: string;
  stroke_color: string;
  stroke_width: number;
  dash?: number[];
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
  layer_group?: string;
  order_key?: string;
  is_visible?: boolean;
  is_locked?: boolean;
}
