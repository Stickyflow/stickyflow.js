import type { RenderNode } from '../../renderScene';
import { type TableRenderContext, tableGridStyle } from './types';

function horizontalRule(context: TableRenderContext, id: string, y: number): RenderNode {
  return {
    type: 'path',
    id,
    order: context.order + 0.1,
    bounds: context.bounds,
    d: `M ${context.table.x + context.gridInset} ${y} H ${context.table.x + context.table.width - context.gridInset}`,
    style: tableGridStyle(context),
  };
}

function renderFooterRule(context: TableRenderContext): RenderNode[] {
  if (!context.table.footer) {
    return [];
  }
  return [horizontalRule(context, `table-footer-rule-${context.table.id}`, context.footerY)];
}

function renderBodyRules(context: TableRenderContext): RenderNode[] {
  return context.table.rows.flatMap((_, rowIndex) => {
    const y = context.table.y + context.headerHeight + rowIndex * context.rowHeight;
    const showRule =
      rowIndex === 0 && context.table.show_header
        ? context.table.header_rule_style !== 'none'
        : (context.table.show_horizontal_lines ?? true);
    const nodes: RenderNode[] = [];
    if (y > context.table.y && showRule) {
      nodes.push(horizontalRule(context, `table-row-${context.table.id}-${rowIndex}`, y));
    }
    if (rowIndex === 0 && context.table.show_header && context.table.header_rule_style === 'double') {
      nodes.push(horizontalRule(context, `table-row-double-${context.table.id}`, y - 4));
    }
    return nodes;
  });
}

export function renderTableRules(context: TableRenderContext): RenderNode[] {
  return [...renderFooterRule(context), ...renderBodyRules(context)];
}
