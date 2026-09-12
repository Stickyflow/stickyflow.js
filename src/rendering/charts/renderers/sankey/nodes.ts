import type { SankeyLayoutNode } from '../../../../model/geometry/sankey';
import { leftRoundedRectPath, rightRoundedRectPath } from '../../../entities/containers';
import type { RenderNode, SceneText } from '../../../scene';
import { finite } from '../../../scene';
import { chartText, contrastTextColor, DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { SankeyRenderData } from './types';

export function renderSankeyNodes(context: ChartRenderContext, data: SankeyRenderData): RenderNode[] {
  const cornerRadius = Math.max(0, finite(context.chart.config?.barCornerRadius, 0));
  const nodes: RenderNode[] = [];
  data.nodes.forEach(node => {
    nodes.push(createNodeRect(context, data, node, cornerRadius));
    if (context.showLabels) {
      nodes.push(createNodeLabel(context, data, node));
    }
  });
  return nodes;
}

function createNodeRect(
  context: ChartRenderContext,
  data: SankeyRenderData,
  node: SankeyLayoutNode,
  cornerRadius: number,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const x = data.baseX + node.x;
  const y = data.baseY + node.y;
  const style = { fill: { kind: 'solid' as const, color: node.color || DEFAULT_ZONE_FILL } };
  const isFirstColumn = node.column === 0;
  const isLastColumn = node.column === data.columnCount - 1;
  if (cornerRadius > 0 && isFirstColumn && isLastColumn) {
    return {
      type: 'rect',
      id: `chart-sankey-node-${chart.id}-${node.id}`,
      order: nextOrder(),
      bounds,
      x,
      y,
      width: node.width,
      height: node.height,
      rx: cornerRadius,
      style,
    };
  }
  if (cornerRadius > 0 && isFirstColumn) {
    return {
      type: 'path',
      id: `chart-sankey-node-${chart.id}-${node.id}`,
      order: nextOrder(),
      bounds,
      d: leftRoundedRectPath(x, y, node.width, node.height, cornerRadius),
      style,
    };
  }
  if (cornerRadius > 0 && isLastColumn) {
    return {
      type: 'path',
      id: `chart-sankey-node-${chart.id}-${node.id}`,
      order: nextOrder(),
      bounds,
      d: rightRoundedRectPath(x, y, node.width, node.height, cornerRadius),
      style,
    };
  }
  return {
    type: 'rect',
    id: `chart-sankey-node-${chart.id}-${node.id}`,
    order: nextOrder(),
    bounds,
    x,
    y,
    width: node.width,
    height: node.height,
    style,
  };
}

function createNodeLabel(context: ChartRenderContext, data: SankeyRenderData, node: SankeyLayoutNode): RenderNode {
  const { chart } = context;
  const position = chart.config?.labelPosition ?? 'outside';
  const label =
    position === 'inside'
      ? createInsideLabel(context, data, node, chart.config?.labelOrientation ?? 'horizontal')
      : createOutsideLabel(context, data, node);
  const color = chart.config?.labelColor ?? (position === 'inside' ? contrastTextColor(node.color) : undefined);
  return color ? { ...label, color } : label;
}

function createOutsideLabel(context: ChartRenderContext, data: SankeyRenderData, node: SankeyLayoutNode): SceneText {
  const { chart, bounds, nextOrder } = context;
  const isLastColumn = node.column === data.columnCount - 1;
  const x = data.baseX + node.x;
  const y = data.baseY + node.y;
  const labelX = isLastColumn ? x - data.labelGutter + 8 : x + node.width + 6;
  return {
    ...chartText({
      id: `chart-sankey-label-${chart.id}-${node.id}`,
      order: nextOrder(),
      bounds,
      frame: { x: labelX, y, width: data.labelGutter - 12, height: Math.max(1, node.height) },
      text: node.label,
      chart,
      align: isLastColumn ? 'right' : 'left',
    }),
    fontSize: data.fontSize - 2,
    verticalAlign: 'middle',
  };
}

function createInsideLabel(
  context: ChartRenderContext,
  data: SankeyRenderData,
  node: SankeyLayoutNode,
  orientation: 'horizontal' | 'vertical',
): SceneText {
  const { chart, bounds, nextOrder } = context;
  const x = data.baseX + node.x;
  const y = data.baseY + node.y;
  const centerX = x + node.width / 2;
  const centerY = y + node.height / 2;
  const fontSize = data.fontSize - 2;
  const id = `chart-sankey-label-${chart.id}-${node.id}`;
  if (orientation === 'vertical') {
    const thickness = fontSize * 1.4;
    const width = Math.max(1, node.height - 8);
    return {
      ...chartText({
        id,
        order: nextOrder(),
        bounds,
        frame: { x: centerX - thickness / 2, y: centerY - width / 2, width, height: thickness },
        text: node.label,
        chart,
        align: 'center',
        rotation: -90,
      }),
      fontSize,
      verticalAlign: 'middle',
      rotationCenter: { x: centerX, y: centerY },
    };
  }
  return {
    ...chartText({
      id,
      order: nextOrder(),
      bounds,
      frame: { x: x + 4, y: centerY - fontSize / 2 - 2, width: Math.max(1, node.width - 8), height: fontSize + 4 },
      text: node.label,
      chart,
      align: 'center',
    }),
    fontSize,
    verticalAlign: 'middle',
  };
}
