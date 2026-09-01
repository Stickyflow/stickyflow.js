import { DEFAULT_FONT, finite } from '../../renderPrimitives';
import type { Point, RenderNode } from '../../renderScene';
import type { LinkRenderContext } from './types';

function endpointLabelPosition(points: number[], end: 'start' | 'end'): Point {
  const index = end === 'start' ? 0 : points.length - 2;
  const neighbor = end === 'start' ? 2 : points.length - 4;
  const x = points[index];
  const y = points[index + 1];
  const dx = points[neighbor] - x;
  const dy = points[neighbor + 1] - y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  return { x: x + ux * 20 - uy * 13, y: y + uy * 20 + ux * 13 };
}

function renderEndpointLabel(context: LinkRenderContext, end: 'start' | 'end', labelIndex: number): RenderNode[] {
  const label = (end === 'start' ? context.link.style?.startLabel : context.link.style?.endLabel)?.trim();
  if (!label) {
    return [];
  }
  const fontSize = finite(context.link.style?.fontSize, 10);
  const position = endpointLabelPosition(context.points, end);
  const width = 90;
  return [
    {
      type: 'text',
      id: `link-${end}-label-${context.link.id}`,
      order: context.order + 0.55 + labelIndex * 0.01,
      bounds: context.bounds,
      x: position.x - width / 2,
      y: position.y - fontSize,
      width,
      height: fontSize * 2,
      lines: [label],
      fontFamily: context.link.style?.fontFamily ?? DEFAULT_FONT,
      fontSize,
      fontWeight: 'normal',
      color: context.color,
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1.4,
    },
  ];
}

export function renderEndpointLabels(context: LinkRenderContext): RenderNode[] {
  return [...renderEndpointLabel(context, 'start', 0), ...renderEndpointLabel(context, 'end', 1)];
}
