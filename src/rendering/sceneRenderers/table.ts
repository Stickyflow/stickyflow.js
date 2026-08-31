import { tableBorderGeometry } from '../../model/geometry/tables';
import { computeRowHeight, type Table } from '../../model/tables';
import { colorAtRamp } from '../field';
import { boxBounds, DEFAULT_FONT, orderOf } from '../renderPrimitives';
import type { RenderNode } from '../renderScene';

export function buildTable(table: Table, index: number): RenderNode[] {
  if (table.is_visible === false) return [];
  const order = orderOf(table, 7_000 + index);
  const rowHeight = table.row_height ?? computeRowHeight(table.font_size);
  const headerHeight = table.show_header ? rowHeight : 0;
  const footerHeight = table.footer ? rowHeight : 0;
  const height = headerHeight + table.rows.length * rowHeight + footerHeight;
  const footerY = table.y + headerHeight + table.rows.length * rowHeight;
  const { doubleBorderGap, gridInset } = tableBorderGeometry(table);
  const bounds = boxBounds(table.x, table.y, table.width, height, table.stroke_width + 4);
  const nodes: RenderNode[] = [
    {
      type: 'rect',
      id: `table-${table.id}`,
      order,
      bounds,
      x: table.x,
      y: table.y,
      width: table.width,
      height,
      rx: table.corner_radius,
      style: simpleContainerStyle(table.fill_color, 'transparent', 0, []),
    },
  ];
  if (table.show_header)
    nodes.push({
      type: 'path',
      id: `table-header-fill-${table.id}`,
      order: order + 0.06,
      bounds,
      d: topRoundedRectPath(table.x, table.y, table.width, rowHeight, table.corner_radius),
      style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
    });
  if (table.footer)
    nodes.push({
      type: 'path',
      id: `table-footer-fill-${table.id}`,
      order: order + 0.06,
      bounds,
      d: bottomRoundedRectPath(table.x, footerY, table.width, rowHeight, table.corner_radius),
      style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
    });
  const columnTotal = table.columns.reduce((sum, column) => sum + column.width, 0);
  const columns =
    columnTotal > 0
      ? table.columns.map(column => ({ ...column, width: column.width * (table.width / columnTotal) }))
      : table.columns;
  let columnX = table.x;
  columns.forEach((column, columnIndex) => {
    if (columnIndex > 0 && (table.show_vertical_lines ?? true))
      nodes.push({
        type: 'path',
        id: `table-column-${table.id}-${column.id}`,
        order: order + 0.1,
        bounds,
        d: `M ${columnX} ${table.y + gridInset} V ${table.y + height - gridInset}`,
        style: {
          fill: { kind: 'none' },
          stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color },
          strokeWidth: table.grid_width ?? 1,
        },
      });
    if (table.show_header)
      nodes.push({
        type: 'text',
        id: `table-header-${table.id}-${column.id}`,
        order: order + 0.2,
        bounds,
        x: columnX + 6,
        y: table.y,
        width: Math.max(0, column.width - 12),
        height: rowHeight,
        lines: [column.label],
        fontFamily: table.font_family ?? DEFAULT_FONT,
        fontSize: table.font_size,
        fontWeight: table.font_weight,
        color: table.text_color,
        align: 'left',
        verticalAlign: 'middle',
        lineHeight: 1.2,
      });
    table.rows.forEach((row, rowIndex) => {
      const value = row.cells[column.id];
      const cellY = table.y + headerHeight + rowIndex * rowHeight;
      if (column.scale) {
        const numeric = Number(value);
        if (Number.isFinite(numeric))
          nodes.push({
            type: 'rect',
            id: `table-cell-bg-${table.id}-${row.id}-${column.id}`,
            order: order + 0.09,
            bounds,
            x: columnX,
            y: cellY,
            width: column.width,
            height: rowHeight,
            style: simpleContainerStyle(colorAtRamp(column.scale, numeric), 'transparent', 0, []),
          });
      }
      nodes.push({
        type: 'text',
        id: `table-cell-${table.id}-${row.id}-${column.id}`,
        order: order + 0.3,
        bounds,
        x: columnX + 6,
        y: cellY,
        width: Math.max(0, column.width - 12),
        height: rowHeight,
        lines: [String(value ?? '')],
        fontFamily: table.font_family ?? DEFAULT_FONT,
        fontSize: table.font_size,
        fontWeight: 'normal',
        color: table.text_color,
        align: column.align ?? 'left',
        verticalAlign: 'middle',
        lineHeight: 1.2,
      });
    });
    if (table.footer)
      nodes.push({
        type: 'text',
        id: `table-footer-${table.id}-${column.id}`,
        order: order + 0.3,
        bounds,
        x: columnX + 6,
        y: footerY,
        width: Math.max(0, column.width - 12),
        height: rowHeight,
        lines: [String(table.footer.cells[column.id] ?? '')],
        fontFamily: table.font_family ?? DEFAULT_FONT,
        fontSize: table.font_size,
        fontWeight: 'bold',
        color: table.text_color,
        align: column.align ?? 'left',
        verticalAlign: 'middle',
        lineHeight: 1.2,
      });
    columnX += column.width;
  });
  if (table.footer)
    nodes.push({
      type: 'path',
      id: `table-footer-rule-${table.id}`,
      order: order + 0.1,
      bounds,
      d: `M ${table.x + gridInset} ${footerY} H ${table.x + table.width - gridInset}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color },
        strokeWidth: table.grid_width ?? 1,
      },
    });
  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const y = table.y + headerHeight + rowIndex * rowHeight;
    const showRule =
      rowIndex === 0 && table.show_header ? table.header_rule_style !== 'none' : (table.show_horizontal_lines ?? true);
    if (y > table.y && showRule)
      nodes.push({
        type: 'path',
        id: `table-row-${table.id}-${rowIndex}`,
        order: order + 0.1,
        bounds,
        d: `M ${table.x + gridInset} ${y} H ${table.x + table.width - gridInset}`,
        style: {
          fill: { kind: 'none' },
          stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color },
          strokeWidth: table.grid_width ?? 1,
        },
      });
    if (rowIndex === 0 && table.show_header && table.header_rule_style === 'double')
      nodes.push({
        type: 'path',
        id: `table-row-double-${table.id}`,
        order: order + 0.1,
        bounds,
        d: `M ${table.x + gridInset} ${y - 4} H ${table.x + table.width - gridInset}`,
        style: {
          fill: { kind: 'none' },
          stroke: { kind: 'solid', color: table.grid_color ?? table.stroke_color },
          strokeWidth: table.grid_width ?? 1,
        },
      });
  }
  if (table.border_style !== 'none')
    nodes.push({
      type: 'rect',
      id: `table-border-${table.id}`,
      order: order + 0.4,
      bounds,
      x: table.x,
      y: table.y,
      width: table.width,
      height,
      rx: table.corner_radius,
      style: simpleContainerStyle('transparent', table.stroke_color, table.stroke_width, table.dash),
    });
  if (table.border_style === 'double')
    nodes.push({
      type: 'rect',
      id: `table-inner-border-${table.id}`,
      order: order + 0.41,
      bounds,
      x: table.x + doubleBorderGap,
      y: table.y + doubleBorderGap,
      width: table.width - doubleBorderGap * 2,
      height: height - doubleBorderGap * 2,
      rx: Math.max(0, table.corner_radius - doubleBorderGap),
      style: simpleContainerStyle('transparent', table.stroke_color, table.stroke_width, []),
    });
  return nodes;
}

import { bottomRoundedRectPath, simpleContainerStyle, topRoundedRectPath } from './containers';
