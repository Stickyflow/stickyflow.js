import type { Table, TableColumn } from '../../model/tables';
import type { Bounds, SceneStyle } from '../scene';

export interface PositionedTableColumn extends TableColumn {
  x: number;
}

export interface TableRenderContext {
  table: Table;
  order: number;
  rowHeight: number;
  headerHeight: number;
  height: number;
  footerY: number;
  doubleBorderGap: number;
  gridInset: number;
  bounds: Bounds;
  columns: PositionedTableColumn[];
}

export function tableGridStyle(context: TableRenderContext): SceneStyle {
  return {
    fill: { kind: 'none' },
    stroke: { kind: 'solid', color: context.table.grid_color ?? context.table.stroke_color },
    strokeWidth: context.table.grid_width ?? 1,
  };
}
