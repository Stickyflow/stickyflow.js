import type { SankeyLayoutNode } from '../../../../model/chart/geometry/sankey';
import { estimateTextWidth } from '../../../../model/geometry/text';
import { leftRoundedRectPath, rightRoundedRectPath } from '../../../entities/containers';
import type { RenderNode, SceneText } from '../../../scene';
import { finite } from '../../../scene';
import {
  chartText,
  contrastTextColor,
  DEFAULT_ZONE_FILL,
  isLightColor,
  resolveChartShadow,
  sameHueTint,
} from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { SankeyRenderData } from './types';

const OUTSIDE_LABEL_LIGHTNESS_ON_LIGHT_BG = 0.3;
const OUTSIDE_LABEL_LIGHTNESS_ON_DARK_BG = 0.78;

export function renderSankeyNodes(context: ChartRenderContext, data: SankeyRenderData): RenderNode[] {
  const cornerRadius = Math.max(0, finite(context.chart.config?.barCornerRadius, 0));
  const nodes: RenderNode[] = [];
  data.nodes.forEach(node => {
    nodes.push(createNodeRect(context, data, node, cornerRadius));
    const label = context.showLabels ? createNodeLabel(context, data, node) : undefined;
    if (label) {
      nodes.push(label);
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
  const style = {
    fill: { kind: 'solid' as const, color: node.color || DEFAULT_ZONE_FILL },
    shadow: resolveChartShadow(chart.shadow_style),
  };
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

function createNodeLabel(
  context: ChartRenderContext,
  data: SankeyRenderData,
  node: SankeyLayoutNode,
): RenderNode | undefined {
  const { chart } = context;
  const position = chart.config?.labelPosition ?? 'outside';
  const label =
    position === 'inside'
      ? createInsideLabel(context, data, node, chart.config?.labelOrientation ?? 'horizontal')
      : createOutsideLabel(context, data, node);
  if (!label) {
    return undefined;
  }
  const fallback = chart.text_color ?? '#0f172a';
  const defaultColor =
    position === 'inside'
      ? contrastTextColor(node.color)
      : (sameHueTint(
          node.color,
          isLightColor(fallback) ? OUTSIDE_LABEL_LIGHTNESS_ON_DARK_BG : OUTSIDE_LABEL_LIGHTNESS_ON_LIGHT_BG,
        ) ?? fallback);
  const color = chart.config?.labelColor ?? defaultColor;
  return { ...label, color };
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
    fontWeight: 'bold',
    verticalAlign: 'middle',
  };
}

function createInsideLabel(
  context: ChartRenderContext,
  data: SankeyRenderData,
  node: SankeyLayoutNode,
  orientation: 'horizontal' | 'vertical',
): SceneText | undefined {
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
    if (estimateTextWidth(node.label, fontSize, false) > width) {
      return undefined;
    }
    return {
      ...chartText({
        id,
        order: nextOrder(),
        bounds,
        frame: { x: centerX - width / 2, y: centerY - thickness / 2, width, height: thickness },
        text: node.label,
        chart,
        align: 'center',
        rotation: -90,
      }),
      fontSize,
      fontWeight: 'bold',
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
    fontWeight: 'bold',
    verticalAlign: 'middle',
  };
}
