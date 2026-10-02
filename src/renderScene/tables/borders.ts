import { simpleContainerStyle } from '../entities/containers';
import type { RenderNode } from '../scene';
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
    rx: context.table.cornerRadius,
    style: simpleContainerStyle(
      'transparent',
      context.table.strokeColor,
      context.table.strokeWidth,
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
    rx: Math.max(0, context.table.cornerRadius - context.doubleBorderGap),
    style: simpleContainerStyle('transparent', context.table.strokeColor, context.table.strokeWidth, []),
  };
}

export function renderTableBorders(context: TableRenderContext): RenderNode[] {
  if (context.table.borderStyle === 'none') {
    return [];
  }
  const nodes = [outerBorder(context)];
  if (context.table.borderStyle === 'double') {
    nodes.push(innerBorder(context));
  }
  return nodes;
}
