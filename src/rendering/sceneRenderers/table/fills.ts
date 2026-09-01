import type { RenderNode } from '../../renderScene';
import { bottomRoundedRectPath, simpleContainerStyle, topRoundedRectPath } from '../containers';
import type { TableRenderContext } from './types';

export function renderTableFills(context: TableRenderContext): RenderNode[] {
  const { table, order, bounds, height, rowHeight, footerY } = context;
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
  if (table.show_header) {
    nodes.push({
      type: 'path',
      id: `table-header-fill-${table.id}`,
      order: order + 0.06,
      bounds,
      d: topRoundedRectPath(table.x, table.y, table.width, rowHeight, table.corner_radius),
      style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
    });
  }
  if (table.footer) {
    nodes.push({
      type: 'path',
      id: `table-footer-fill-${table.id}`,
      order: order + 0.06,
      bounds,
      d: bottomRoundedRectPath(table.x, footerY, table.width, rowHeight, table.corner_radius),
      style: simpleContainerStyle(table.header_fill_color ?? '#f1f5f9', 'transparent', 0, []),
    });
  }
  return nodes;
}
