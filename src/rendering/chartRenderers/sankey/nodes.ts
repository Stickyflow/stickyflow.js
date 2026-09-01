import type { SankeyLayoutNode } from '../../../model/geometry/sankey';
import { chartText, DEFAULT_ZONE_FILL } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { SankeyRenderData } from './types';

export function renderSankeyNodes(context: ChartRenderContext, data: SankeyRenderData): RenderNode[] {
  const nodes: RenderNode[] = [];
  data.nodes.forEach(node => {
    nodes.push(createNodeRect(context, data, node));
    if (context.showLabels) {
      nodes.push(createNodeLabel(context, data, node));
    }
  });
  return nodes;
}

function createNodeRect(context: ChartRenderContext, data: SankeyRenderData, node: SankeyLayoutNode): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-sankey-node-${chart.id}-${node.id}`,
    order: nextOrder(),
    bounds,
    x: data.baseX + node.x,
    y: data.baseY + node.y,
    width: node.width,
    height: node.height,
    style: { fill: { kind: 'solid', color: node.color || DEFAULT_ZONE_FILL } },
  };
}

function createNodeLabel(context: ChartRenderContext, data: SankeyRenderData, node: SankeyLayoutNode): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const isLastColumn = node.column === data.columnCount - 1;
  const x = data.baseX + node.x;
  const y = data.baseY + node.y;
  const labelX = isLastColumn ? x - data.labelGutter + 8 : x + node.width + 6;
  return {
    ...chartText(
      `chart-sankey-label-${chart.id}-${node.id}`,
      nextOrder(),
      bounds,
      labelX,
      y,
      data.labelGutter - 12,
      Math.max(1, node.height),
      node.label,
      chart,
      isLastColumn ? 'right' : 'left',
    ),
    fontSize: data.fontSize - 2,
    verticalAlign: 'middle',
  };
}
