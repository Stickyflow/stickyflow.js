import type { Component } from '../../../model/component';
import { DEFAULT_FONT, finite, type RenderNode, rotatedBounds } from '../../scene';

const STROKE = '#94a3b8';

export function buildPlaceholder(component: Component, index: number): RenderNode[] {
  const x = finite(component.x, 0);
  const y = finite(component.y, 0);
  const width = Math.max(0, finite(component.width, 120));
  const height = Math.max(0, finite(component.height, 60));
  const rotation = finite(component.rotation, 0);
  const order = 10_000 + index;
  const bounds = rotatedBounds({ x, y, width, height }, rotation, 2);
  return [
    {
      id: `widget-${component.id}`,
      type: 'rect',
      order,
      bounds,
      x,
      y,
      width,
      height,
      rx: 6,
      rotation,
      style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: STROKE }, strokeWidth: 1, dash: [4, 3] },
    },
    {
      id: `widget-${component.id}-label`,
      type: 'text',
      order: order + 0.1,
      bounds,
      x,
      y,
      width,
      height,
      lines: [component.type],
      fontFamily: DEFAULT_FONT,
      fontSize: 12,
      fontWeight: 'normal',
      color: STROKE,
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1.3,
      rotation,
    },
  ];
}
