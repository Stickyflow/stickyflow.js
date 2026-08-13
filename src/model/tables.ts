/**
 * Table entity - Container rendering a configurable grid of columns and rows,
 * for DB-schema/ER and UML-attribute diagrams. Structurally closest to
 * Swimlane (a container with a configurable ordered sub-structure), but
 * generalizes the single "lanes" axis to two independent axes: `columns`
 * (header definition, incl. per-column width and text|boolean cell type) and
 * `rows` (cell values keyed by column id).
 *
 * Row height is intentionally fixed (derived from font_size) - only column
 * width is user-adjustable via divider-drag, mirroring Swimlane's lane-resize
 * but on one axis instead of two.
 */

import type { ChartRamp } from './charts'

export interface TableColumn {
  id: string
  label: string                  // Column header, e.g. "Field", "Type", "PK"
  width: number                   // Absolute pixel width (like Lane.size, but the horizontal axis)
  type: 'text' | 'boolean' | 'number'   // Rendering hint: text input, checkbox/icon toggle, or numeric cell
  // SFL 1.4, §3.6: horizontal text alignment - structural (like `width`),
  // not a style{} property, since Column carries no layout{}/style{}.
  align?: 'left' | 'center' | 'right'
  // SFL 1.4, §3.6: value-dependent cell background, same "ramp(<color> <pos>,
  // …)" value-form as Chart.scale (§3.4/Fields) - decoded to the shared
  // {type:'ramp', stops} shape at the SFL adapter boundary (sflToImportJson),
  // same place Chart's own `scale` is decoded (see chartObject there).
  scale?: ChartRamp
}

export interface TableRow {
  id: string
  cells: Record<string, string | boolean>   // keyed by TableColumn.id
}

export interface Table {
  id: string
  board_id: string
  name?: string  // lesbarer, board-eindeutiger Slug (SFL-Identität)
  x: number
  y: number
  width: number
  height: number
  title?: string | null   // Tabellenname (z.B. "users"), im Header gerendert

  columns: TableColumn[]
  rows: TableRow[]
  // SFL 1.4, §3.6: optional summary row (`Footer` block), same cell shape as
  // a TableRow - rendered as an extra, non-virtualized row fixed right after
  // the last data row (bold, ruled-off). At most one per table. `undefined`
  // (never `null`) when absent - this package has no live-patch mechanism
  // that would need the null/undefined distinction stickyflow-atlas uses.
  footer?: TableRow

  // Styling
  stroke_color: string
  stroke_width: number
  dash: number[]
  corner_radius: number
  fill_color: string
  header_fill_color?: string
  grid_color?: string
  grid_width?: number
  border_style?: 'none' | 'single' | 'double'
  header_rule_style?: 'none' | 'single' | 'double'
  show_horizontal_lines?: boolean
  show_vertical_lines?: boolean

  // Text styling for title/header/cell text
  text_color: string
  font_family?: string
  font_size: number
  font_weight: 'normal' | 'bold'
  row_height?: number
  show_header: boolean   // Toggles the column-header row, independent of each column's own `label`

  // Layer Management
  layer_group: string
  order_key: string
  is_visible: boolean
  is_locked: boolean

  // Entity Group Assignment
  entity_group_id?: string | null

  // Timestamps
  created_at: string
  updated_at?: string | null
}

export interface TableCreate {
  id?: string
  name?: string
  x: number
  y: number
  width?: number
  height?: number
  title?: string | null
  columns?: TableColumn[]
  rows?: TableRow[]
  stroke_color?: string
  stroke_width?: number
  dash?: number[]
  corner_radius?: number
  fill_color?: string
  header_fill_color?: string
  grid_color?: string
  grid_width?: number
  border_style?: 'none' | 'single' | 'double'
  header_rule_style?: 'none' | 'single' | 'double'
  show_horizontal_lines?: boolean
  show_vertical_lines?: boolean
  text_color?: string
  font_family?: string
  font_size?: number
  font_weight?: 'normal' | 'bold'
  row_height?: number
  show_header?: boolean
  layer_group?: string
  order_key?: string
  entity_group_id?: string | null
}

export interface TableUpdate {
  name?: string
  x?: number
  y?: number
  width?: number
  height?: number
  title?: string | null
  columns?: TableColumn[]
  rows?: TableRow[]
  stroke_color?: string
  stroke_width?: number
  dash?: number[]
  corner_radius?: number
  fill_color?: string
  header_fill_color?: string
  grid_color?: string
  grid_width?: number
  border_style?: 'none' | 'single' | 'double'
  header_rule_style?: 'none' | 'single' | 'double'
  show_horizontal_lines?: boolean
  show_vertical_lines?: boolean
  text_color?: string
  font_family?: string
  font_size?: number
  font_weight?: 'normal' | 'bold'
  row_height?: number
  show_header?: boolean
  layer_group?: string
  order_key?: string
  is_visible?: boolean
  is_locked?: boolean
  entity_group_id?: string | null
}

export const TABLE_CORNER_RADIUS = 12
export const TABLE_MIN_COLUMN_WIDTH = 40
export const TABLE_MIN_WIDTH = 200

/** Row/header height - fixed (not user-resizable), derived from font_size so
 * larger text still fits. Shared by rendering and computeTableHeight() below
 * so both always agree on the same row extent. */
export function computeRowHeight(fontSize: number): number {
  return Math.max(24, fontSize * 1.8)
}

/** Table height is DERIVED (header, if shown, plus one row-slot per row) -
 * not independently user-resizable the way Frame/Swimlane height is. Callers
 * that change `rows`, `font_size`, or `show_header` must recompute and patch
 * `height` alongside so `table.height` (read by resize-snap, export bounds,
 * the layer panel, etc.) never drifts from what's actually rendered. */
export function computeTableHeight(table: { font_size: number; rows: TableRow[]; show_header: boolean; row_height?: number; footer?: TableRow | null }): number {
  const rowHeight = table.row_height ?? computeRowHeight(table.font_size)
  const headerHeight = table.show_header ? rowHeight : 0
  const footerHeight = table.footer ? rowHeight : 0
  return headerHeight + table.rows.length * rowHeight + footerHeight
}

export function createDefaultColumns(): TableColumn[] {
  return [
    { id: 'col-1', label: 'Field', width: 150, type: 'text' },
    { id: 'col-2', label: 'Type', width: 120, type: 'text' },
    { id: 'col-3', label: 'Constraints', width: 150, type: 'text' },
  ]
}

export function createDefaultRows(columns: TableColumn[] = createDefaultColumns()): TableRow[] {
  const emptyCells = (): Record<string, string | boolean> => {
    const cells: Record<string, string | boolean> = {}
    columns.forEach(col => { cells[col.id] = col.type === 'boolean' ? false : '' })
    return cells
  }
  return [
    { id: 'row-1', cells: { ...emptyCells(), 'col-1': 'id', 'col-2': 'uuid', 'col-3': 'PRIMARY KEY' } },
    { id: 'row-2', cells: emptyCells() },
  ]
}

// Default values for new tables
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
}
