import type { Shape } from '../../model/shapes';
import { SHAPE_DEFAULTS } from '../../model/shapes';
import type { Frame } from '../../model/frames';
import type { Link, MarkerType } from '../../model/links';
import { getLinkStrokeColor } from '../../model/links';
import type { Swimlane } from '../../model/swimlanes';
import { computeRowHeight, type Table } from '../../model/tables';
import type { FreeformPath } from '../../model/paths';
import { colorAtRamp } from '../field';
import { tableBorderGeometry } from '../../model/geometry/tables';
import { localShapePath } from '../../model/geometry/shapes';
import { wrapText, heuristicRichMeasure, type MeasureTextFactory } from '../../model/geometry/text';
import { hasBoldMarkup, wrapRichText } from '../../model/geometry/richText';
import { getDashArray, getLineMidpoint, getPathPoints, labelGapDash, roundedOrthogonalPathData } from '../../model/geometry/connectionLine';
import type { PathSegment } from '../../model/geometry/router';
import type {
  Bounds, RenderDiagnostic, RenderInput, RenderNode, RenderScene,
  ScenePath, SceneStyle, SceneText,
} from '../renderScene';
import { DEFAULT_FONT, EMPTY_BOUNDS, finite, orderOf, boxBounds, rotatedBounds, paint, freeformPathData, tag } from '../renderPrimitives';
import { buildChart } from '../charts';

export function buildTable(table: Table, index: number): RenderNode[] {
  if (table.is_visible === false) return [];
  const order = orderOf(table, 7_000 + index);
  const rowHeight = table.row_height ?? computeRowHeight(table.font_size);
  const headerHeight = table.show_header ? rowHeight : 0;
  // §3.6 Tables: Footer is an extra fixed row right after the last data row -
  // one more rowHeight added to the table's own total height, same as
  // computeTableHeight()'s footer term (model/tables.ts).
  const footerHeight = table.footer ? rowHeight : 0;
  const height = headerHeight + table.rows.length * rowHeight + footerHeight;
  const footerY = table.y + headerHeight + table.rows.length * rowHeight;
  const { doubleBorderGap, gridInset } = tableBorderGeometry(table);
  const bounds = boxBounds(table.x, table.y, table.width, height, table.stroke_width + 4);
  const nodes: RenderNode[] = [{
    type: 'rect', id: `table-${table.id}`, order, bounds,
    x: table.x, y: table.y, width: table.width, height, rx: table.corner_radius,
    style: simpleContainerStyle(table.fill_color, 'transparent', 0, []),
  }];
  if (table.show_header) nodes.push({
    type: 'path', id: `table-header-fill-${table.id}`, order: order + .06, bounds,
    d: topRoundedRectPath(table.x, table.y, table.width, rowHeight, table.corner_radius),
    style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
  });
  // §3.6 Tables: Footer background, same color as the header band, bottom-
  // rounded since it's now the table's visual bottom (the single outer body
  // rect above already spans this height too, so no other node needs to
  // change its own corner rounding - unlike the Konva/atlas renderer, this
  // SVG body is one rect for the whole table, not one rect per row).
  if (table.footer) nodes.push({
    type: 'path', id: `table-footer-fill-${table.id}`, order: order + .06, bounds,
    d: bottomRoundedRectPath(table.x, footerY, table.width, rowHeight, table.corner_radius),
    style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
  });
  // Scale column widths to sum exactly to the table's own declared width —
  // same fix, same reasoning as buildSwimlane's lane scaling: the real app
  // guarantees this on every resize (see columnScaling.ts's
  // scaleColumnsToWidth), so it's never violated there, but nothing enforced
  // it for SFL-declared columns. Without it, a mismatch left dividers/cells
  // past the table's own bounds (built from table.width alone), clipped by
  // the scene's viewBox instead of the columns being harmlessly proportioned.
  const columnTotal = table.columns.reduce((sum, column) => sum + column.width, 0);
  const columns = columnTotal > 0
    ? table.columns.map(column => ({ ...column, width: column.width * (table.width / columnTotal) }))
    : table.columns;
  let columnX = table.x;
  columns.forEach((column, columnIndex) => {
    if (columnIndex > 0 && (table.show_vertical_lines ?? true)) nodes.push({
      type: 'path', id: `table-column-${table.id}-${column.id}`, order: order + .1, bounds,
      d: `M ${columnX} ${table.y + gridInset} V ${table.y + height - gridInset}`,
      style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
    });
    if (table.show_header) nodes.push({
      type: 'text', id: `table-header-${table.id}-${column.id}`, order: order + .2, bounds,
      x: columnX + 6, y: table.y, width: Math.max(0, column.width - 12), height: rowHeight,
      lines: [column.label], fontFamily: table.font_family ?? DEFAULT_FONT, fontSize: table.font_size,
      fontWeight: table.font_weight, color: table.text_color, align: 'left', verticalAlign: 'middle', lineHeight: 1.2,
    });
    table.rows.forEach((row, rowIndex) => {
      const value = row.cells[column.id];
      const cellY = table.y + headerHeight + rowIndex * rowHeight;
      // §3.6 Tables: Column.scale value-dependent cell background, drawn
      // behind the cell text (order + .09, before the .1-tier grid lines so
      // they still show up on top of a colored cell, and well before the
      // .3-tier text). A non-numeric value (NaN) leaves the cell uncolored,
      // same as atlas's TableComponent.tsx cellFill().
      if (column.scale) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) nodes.push({
          type: 'rect', id: `table-cell-bg-${table.id}-${row.id}-${column.id}`, order: order + .09, bounds,
          x: columnX, y: cellY, width: column.width, height: rowHeight,
          style: simpleContainerStyle(colorAtRamp(column.scale, numeric), 'transparent', 0, []),
        });
      }
      nodes.push({
        type: 'text', id: `table-cell-${table.id}-${row.id}-${column.id}`, order: order + .3, bounds,
        x: columnX + 6, y: cellY,
        width: Math.max(0, column.width - 12), height: rowHeight,
        lines: [String(value ?? '')],
        fontFamily: table.font_family ?? DEFAULT_FONT, fontSize: table.font_size, fontWeight: 'normal',
        color: table.text_color, align: column.align ?? 'left', verticalAlign: 'middle', lineHeight: 1.2,
      });
    });
    // §3.6 Tables: Footer cell text - bold, same alignment as its column's
    // data cells, no scale background (a summary row isn't itself a sampled
    // value on the same ramp, matching atlas's Footer rendering).
    if (table.footer) nodes.push({
      type: 'text', id: `table-footer-${table.id}-${column.id}`, order: order + .3, bounds,
      x: columnX + 6, y: footerY,
      width: Math.max(0, column.width - 12), height: rowHeight,
      lines: [String(table.footer.cells[column.id] ?? '')],
      fontFamily: table.font_family ?? DEFAULT_FONT, fontSize: table.font_size, fontWeight: 'bold',
      color: table.text_color, align: column.align ?? 'left', verticalAlign: 'middle', lineHeight: 1.2,
    });
    columnX += column.width;
  });
  // §3.6 Tables: Footer's own top rule - always drawn (unlike ordinary row
  // dividers, not gated by show_horizontal_lines), the same fixed-separator
  // treatment as atlas's TableComponent.tsx footer rule.
  if (table.footer) nodes.push({
    type: 'path', id: `table-footer-rule-${table.id}`, order: order + .1, bounds,
    d: `M ${table.x + gridInset} ${footerY} H ${table.x + table.width - gridInset}`,
    style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
  });
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const y = table.y + headerHeight + rowIndex * rowHeight;
    const showRule = rowIndex === 0 && table.show_header
      ? table.header_rule_style !== 'none'
      : (table.show_horizontal_lines ?? true);
    if (y > table.y && showRule) nodes.push({
      type: 'path', id: `table-row-${table.id}-${rowIndex}`, order: order + .1, bounds,
      d: `M ${table.x + gridInset} ${y} H ${table.x + table.width - gridInset}`,
      style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
    });
    if (rowIndex === 0 && table.show_header && table.header_rule_style === 'double') nodes.push({
      type: 'path', id: `table-row-double-${table.id}`, order: order + .1, bounds,
      d: `M ${table.x + gridInset} ${y - 4} H ${table.x + table.width - gridInset}`,
      style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color }, strokeWidth: table.grid_width ?? 1 },
    });
  }
  if (table.border_style !== 'none') nodes.push({
    type: 'rect', id: `table-border-${table.id}`, order: order + .4, bounds,
    x: table.x, y: table.y, width: table.width, height, rx: table.corner_radius,
    style: simpleContainerStyle('transparent', table.stroke_color, table.stroke_width, table.dash),
  });
  if (table.border_style === 'double') nodes.push({
    type: 'rect', id: `table-inner-border-${table.id}`, order: order + .41, bounds,
    x: table.x + doubleBorderGap, y: table.y + doubleBorderGap, width: table.width - doubleBorderGap * 2, height: height - doubleBorderGap * 2, rx: Math.max(0, table.corner_radius - doubleBorderGap),
    style: simpleContainerStyle('transparent', table.stroke_color, table.stroke_width, []),
  });
  return nodes;
}




import { bottomRoundedRectPath, simpleContainerStyle, topRoundedRectPath } from './containers';

