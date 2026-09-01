import type { RenderNode } from '../../renderScene';
import { simpleContainerStyle } from '../containers';
import type { TableRenderContext } from './types';

function outerBorder(context: TableRenderContext): RenderNode {
  return {
    type: 'rect',
    id: `table-border-${context.table.id}`,
    order: context.order + 0.4,
    bounds: context.bounds,
    x: context.table.x,
    y: context.table.y,
    width: context.table.width,
    height: context.height,
    rx: context.table.corner_radius,
    style: simpleContainerStyle(
      'transparent',
      context.table.stroke_color,
      context.table.stroke_width,
      context.table.dash,
    ),
  };
}

function innerBorder(context: TableRenderContext): RenderNode {
  return {
    type: 'rect',
    id: `table-inner-border-${context.table.id}`,
    order: context.order + 0.41,
    bounds: context.bounds,
    x: context.table.x + context.doubleBorderGap,
    y: context.table.y + context.doubleBorderGap,
    width: context.table.width - context.doubleBorderGap * 2,
    height: context.height - context.doubleBorderGap * 2,
    rx: Math.max(0, context.table.corner_radius - context.doubleBorderGap),
    style: simpleContainerStyle('transparent', context.table.stroke_color, context.table.stroke_width, []),
  };
}

export function renderTableBorders(context: TableRenderContext): RenderNode[] {
  if (context.table.border_style === 'none') {
    return [];
  }
  const nodes = [outerBorder(context)];
  if (context.table.border_style === 'double') {
    nodes.push(innerBorder(context));
  }
  return nodes;
}
