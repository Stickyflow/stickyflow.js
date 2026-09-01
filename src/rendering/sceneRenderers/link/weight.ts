import type { RenderNode } from '../../renderScene';
import type { LinkRenderContext } from './types';

export function renderWeightBadge(context: LinkRenderContext): RenderNode[] {
  const { link } = context;
  if (link.weight === undefined || link.weight === null || link.showWeight === false) {
    return [];
  }
  const text = link.weight.toFixed(1);
  const width = Math.max(30, text.length * 8 + 12);
  const height = 16;
  const y = context.midpoint.y + (context.label.visible ? context.label.height / 2 + 10 : 0);
  return [
    {
      type: 'rect',
      id: `link-weight-badge-${link.id}`,
      order: context.order + 0.6,
      bounds: context.bounds,
      x: context.midpoint.x - width / 2,
      y: y - height / 2,
      width,
      height,
      rx: height / 2,
      style: { fill: { kind: 'solid', color: context.color }, stroke: { kind: 'none' }, opacity: 0.92 },
    },
    {
      type: 'text',
      id: `link-weight-${link.id}`,
      order: context.order + 0.61,
      bounds: context.bounds,
      x: context.midpoint.x - width / 2,
      y: y - height / 2,
      width,
      height,
      lines: [text],
      fontFamily: 'Arial, sans-serif',
      fontSize: 10,
      fontWeight: 'bold',
      color: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1,
    },
  ];
}
