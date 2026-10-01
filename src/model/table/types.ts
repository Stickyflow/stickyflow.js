import type { ChartRamp } from '../chart/colorScale';

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
  columnsBlockName?: string;
  rowsBlockName?: string;
  footerBlockName?: string;
  strokeColor: string;
  strokeWidth: number;
  dash?: number[];
  cornerRadius: number;
  fillColor: string;
  headerFillColor?: string;
  gridColor?: string;
  gridWidth?: number;
  borderStyle?: 'none' | 'single' | 'double';
  headerRuleStyle?: 'none' | 'single' | 'double';
  showHorizontalLines?: boolean;
  showVerticalLines?: boolean;
  textColor: string;
  fontFamily?: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  rowHeight?: number;
  showHeader: boolean;
  layerGroup?: string;
  orderKey?: string;
  order?: number;
  isVisible?: boolean;
  isLocked?: boolean;
}
