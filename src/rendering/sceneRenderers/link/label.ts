import { DEFAULT_FONT } from '../../renderPrimitives';
import type { RenderNode } from '../../renderScene';
import type { LinkRenderContext } from './types';

export function renderMainLabel(context: LinkRenderContext): RenderNode[] {
  if (!context.label.visible) {
    return [];
  }
  return [
    {
      type: 'text',
      id: `link-text-${context.link.id}`,
      order: context.order + 0.5,
      bounds: context.bounds,
      x: context.midpoint.x - context.label.width / 2,
      y: context.midpoint.y - context.label.fontSize,
      width: context.label.width,
      height: context.label.fontSize * 2,
      lines: context.label.lines,
      fontFamily: context.link.style?.fontFamily ?? DEFAULT_FONT,
      fontSize: context.label.fontSize,
      fontWeight: 'normal',
      color: context.color,
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1.4,
    },
  ];
}
